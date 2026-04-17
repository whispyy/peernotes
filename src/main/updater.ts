import { app, dialog, nativeImage, shell } from 'electron'
import { createWriteStream } from 'fs'
import { get as httpsGet, RequestOptions } from 'https'
import { join } from 'path'

function getAppIcon() {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return nativeImage.createFromPath(join(base, 'icon.png'))
}

const GITHUB_REPO = 'whispyy/peernotes'
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

interface ReleaseAsset {
  name: string
  browser_download_url: string
}

interface Release {
  tag_name: string
  assets: ReleaseAsset[]
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const options: RequestOptions = {
      headers: { 'User-Agent': 'peernotes-updater' }
    }
    httpsGet(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchJson<T>(res.headers.location!).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      httpsGet(u, { headers: { 'User-Agent': 'peernotes-updater' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location!)
          return
        }
        const file = createWriteStream(dest)
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
        file.on('error', reject)
        res.on('error', reject)
      }).on('error', reject)
    }
    follow(url)
  })
}

export async function checkForUpdates(silent = false): Promise<void> {
  try {
    const release = await fetchJson<Release>(API_URL)

    if (!release?.tag_name) {
      if (!silent) dialog.showErrorBox('Update check failed', 'Could not parse the latest release from GitHub.')
      return
    }

    const currentVersion = app.getVersion()
    const icon = getAppIcon()

    if (compareVersions(release.tag_name, currentVersion) <= 0) {
      if (!silent) {
        await dialog.showMessageBox({
          type: 'info',
          icon,
          title: 'No updates available',
          message: `You're already on the latest version (${currentVersion}).`
        })
      }
      return
    }

    // Pick the DMG matching the current architecture
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const asset =
      release.assets.find((a) => a.name.endsWith('.dmg') && a.name.includes(arch)) ??
      release.assets.find((a) => a.name.endsWith('.dmg'))

    if (!asset) {
      // No DMG found — fall back to opening the release page
      await dialog.showMessageBox({
        type: 'info',
        icon,
        title: 'Update available',
        message: `Peernotes ${release.tag_name} is available`,
        detail: `You're running ${currentVersion}. Click OK to open the releases page.`,
        buttons: ['Open releases page', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) shell.openExternal(`https://github.com/${GITHUB_REPO}/releases/latest`)
      })
      return
    }

    const { response } = await dialog.showMessageBox({
      type: 'info',
      icon,
      title: 'Update available',
      message: `Peernotes ${release.tag_name} is available`,
      detail: `You're running ${currentVersion}. Download and open the installer?`,
      buttons: ['Download & Install', 'Later'],
      defaultId: 0,
      cancelId: 1
    })

    if (response !== 0) return

    const dest = join(app.getPath('temp'), asset.name)
    await downloadFile(asset.browser_download_url, dest)
    shell.openPath(dest)
  } catch {
    if (!silent) dialog.showErrorBox('Update check failed', 'An error occurred while checking for updates.')
  }
}

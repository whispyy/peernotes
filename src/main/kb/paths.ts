import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Knowledge base docs are keyed by workspace *id* rather than name slug so a
 * workspace rename never orphans the folder. The GitHub mirror uses the slug
 * (see sync.ts) — the mapping happens at push time.
 */
export function kbDir(workspaceId: string): string {
  return path.join(app.getPath('userData'), 'kb', workspaceId)
}

export function ensureKbDir(workspaceId: string): string {
  const dir = kbDir(workspaceId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '')
  return slug || 'topic'
}

export function docPath(workspaceId: string, slug: string): string {
  return path.join(kbDir(workspaceId), `${slug}.md`)
}

export function indexPath(workspaceId: string): string {
  return path.join(kbDir(workspaceId), '_index.md')
}

/** Write via a temp file + rename so a crash mid-write can't truncate a doc. */
export function writeFileAtomic(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, content, 'utf-8')
  fs.renameSync(tmp, filePath)
}

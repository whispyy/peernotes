import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

// App icon
const svg = readFileSync('build/icon.svg', 'utf-8')
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } })
writeFileSync('build/icon.png', resvg.render().asPng())
console.log('✓ build/icon.png generated (1024×1024)')

// Tray icon — monochrome template image for the macOS menu bar
// Black fill on transparent background; macOS inverts it automatically in dark mode.
const traySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
  <path fill="black" d="M2 1h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.25L7 16v-3H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
  <rect x="4" y="5"   width="10" height="1.2" rx="0.6" fill="white"/>
  <rect x="4" y="7.9" width="8"  height="1.2" rx="0.6" fill="white"/>
</svg>`

mkdirSync('resources', { recursive: true })

const appIcon = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } })
writeFileSync('resources/icon.png', appIcon.render().asPng())
console.log('✓ resources/icon.png generated (512×512)')

const tray1x = new Resvg(traySvg, { fitTo: { mode: 'width', value: 18 } })
writeFileSync('resources/tray-iconTemplate.png', tray1x.render().asPng())
console.log('✓ resources/tray-iconTemplate.png generated (18×18)')

const tray2x = new Resvg(traySvg, { fitTo: { mode: 'width', value: 36 } })
writeFileSync('resources/tray-iconTemplate@2x.png', tray2x.render().asPng())
console.log('✓ resources/tray-iconTemplate@2x.png generated (36×36)')

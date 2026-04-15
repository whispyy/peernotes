import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'

const svg = readFileSync('build/icon.svg', 'utf-8')
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } })
const png = resvg.render().asPng()
writeFileSync('build/icon.png', png)

console.log('✓ build/icon.png generated (1024×1024)')

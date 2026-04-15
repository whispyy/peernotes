import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('build/icon.svg')

await sharp(svg)
  .resize(1024, 1024)
  .png()
  .toFile('build/icon.png')

console.log('✓ build/icon.png generated (1024×1024)')

// Renders app/icon.svg into app/favicon.ico (PNG-in-ICO, 16 + 32 px) so
// browsers without SVG favicon support (Safari) get the same mark.
// Run: node scripts/build-favicon.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const app = join(dirname(fileURLToPath(import.meta.url)), "..", "app")
const svg = readFileSync(join(app, "icon.svg"))
const sizes = [16, 32]

const pngs = await Promise.all(
  sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer())
)

// ICO container: 6-byte header, 16-byte entry per image, then PNG blobs.
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngs.length, 4)

let offset = 6 + 16 * pngs.length
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0)
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1)
  e.writeUInt8(0, 2)
  e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(png.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += png.length
  return e
})

writeFileSync(join(app, "favicon.ico"), Buffer.concat([header, ...entries, ...pngs]))
console.log(`favicon.ico: ${sizes.join("+")}px`)

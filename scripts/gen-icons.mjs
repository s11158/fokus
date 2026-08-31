// Генерация PWA-иконок без внешних зависимостей: фон-акцент + белый «глаз» круга.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const ACCENT = [0x6c, 0x8c, 0xff]
const WHITE = [0xff, 0xff, 0xff]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const body = Buffer.concat([t, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function png(size, withGlyph) {
  const cx = size / 2, cy = size / 2, r = size * 0.26
  const raw = Buffer.alloc(size * (size * 3 + 1))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // фильтр строки
    for (let x = 0; x < size; x++) {
      const inCircle = withGlyph && (x - cx) ** 2 + (y - cy) ** 2 < r * r
      const c = inCircle ? WHITE : ACCENT
      raw[p++] = c[0]; raw[p++] = c[1]; raw[p++] = c[2]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8 бит, truecolor RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/pwa-192.png', png(192, true))
writeFileSync('public/pwa-512.png', png(512, true))
writeFileSync('public/maskable-512.png', png(512, true))
writeFileSync('public/favicon.png', png(64, true))
console.log('icons generated')

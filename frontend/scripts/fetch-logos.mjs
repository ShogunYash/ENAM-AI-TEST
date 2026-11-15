// Build-time only: node scripts/fetch-logos.mjs [--refresh] [--only=TCS,INFY] [--wiki-only]
// --wiki-only skips the company-site and Google attempts and goes straight to Wikidata/Commons (for symbols the site attempts already missed).
// All requests, including redirects, are sequential and at least one second apart.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const output = path.resolve(here, '../public/logos')
const reportPath = path.join(here, 'logo-fetch-report.json')
const mapping = JSON.parse((await fs.readFile(path.join(here, 'logo-domains.json'), 'utf8')).replace(/^\uFEFF/, ''))
const previous = await fs.readFile(reportPath, 'utf8').then(JSON.parse).catch(() => [])
const reports = new Map(previous.map(row => [row.symbol, row]))
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',')
const wikiOnly = process.argv.includes('--wiki-only')
let lastRequest = 0
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const sha = buffer => createHash('sha256').update(buffer).digest('hex')
async function request(url, allowError = false) {
  for (let redirects = 0; redirects < 6; redirects++) {
    await sleep(Math.max(0, 1000 - (Date.now() - lastRequest)))
    lastRequest = Date.now()
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: {
      'User-Agent': 'FINN-demo-logo-fetch/1.0 (build-time company identification; no runtime hotlinks)',
      Accept: 'text/html,image/png,image/svg+xml,image/x-icon,image/*;q=0.8,*/*;q=0.1',
    } })
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get('location')) {
      await response.body?.cancel(); url = new URL(response.headers.get('location'), url).href; continue
    }
    if (!response.ok && !allowError) { await response.body?.cancel(); throw Error('HTTP ' + response.status) }
    if (Number(response.headers.get('content-length')) > 8_000_000) { await response.body?.cancel(); throw Error('Asset too large') }
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > 8_000_000) throw Error('Asset too large')
    return { buffer, url, status: response.status, type: response.headers.get('content-type') || '' }
  }
  throw Error('Redirect limit')
}
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), (m[2] ?? m[3] ?? m[4]).replace(/&amp;/g, '&')]))
function pageIcons(html, base) {
  const baseTag = html.match(/<base\b[^>]*>/i)?.[0]
  if (baseTag && attrs(baseTag).href) base = new URL(attrs(baseTag).href, base).href
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0])).filter(link => /(?:^|\s)(?:apple-touch-icon(?:-precomposed)?|icon)(?:\s|$)/i.test(link.rel || '') && link.href)
    .map(link => ({ url: new URL(link.href, base).href, apple: /apple-touch-icon/i.test(link.rel), size: Math.max(0, ...[...(link.sizes || '').matchAll(/(\d+)x(\d+)/g)].map(match => Math.min(Number(match[1]), Number(match[2])))) }))
    .filter(link => /^https?:/.test(link.url)).sort((a, b) => Number(b.apple) - Number(a.apple) || b.size - a.size).slice(0, 8)
}
function icoFrame(buffer) {
  if (buffer.length < 6 || buffer.readUInt32LE(0) !== 65536) return null
  const frames = []
  for (let n = 0; n < buffer.readUInt16LE(4); n++) {
    const start = 6 + n * 16
    if (start + 16 > buffer.length) break
    const width = buffer[start] || 256, height = buffer[start + 1] || 256
    const size = buffer.readUInt32LE(start + 8), offset = buffer.readUInt32LE(start + 12)
    if (width >= 48 && height >= 48 && offset + size <= buffer.length) frames.push({ width, height, bytes: buffer.subarray(offset, offset + size) })
  }
  for (const frame of frames.sort((a, b) => b.width * b.height - a.width * a.height)) {
    const b = frame.bytes
    if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { input: b }
    if (b.length < 40) continue
    const header = b.readUInt32LE(0), bits = b.readUInt16LE(14)
    if (header < 40 || ![24, 32].includes(bits) || b.readUInt32LE(16) !== 0) continue
    const { width, height } = frame, stride = Math.ceil(width * bits / 32) * 4
    if (header + stride * height > b.length) continue
    const rgba = Buffer.alloc(width * height * 4); let hasAlpha = false
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const src = header + (height - 1 - y) * stride + x * bits / 8, dest = (y * width + x) * 4
      rgba[dest] = b[src + 2]; rgba[dest + 1] = b[src + 1]; rgba[dest + 2] = b[src]
      rgba[dest + 3] = bits === 32 ? b[src + 3] : 255; hasAlpha ||= rgba[dest + 3] > 0
    }
    if (!hasAlpha) for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
    const mask = header + stride * height, maskStride = Math.ceil(width / 32) * 4
    if (mask + maskStride * height <= b.length) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (b[mask + (height - 1 - y) * maskStride + (x >> 3)] & (128 >> (x % 8))) rgba[(y * width + x) * 4 + 3] = 0
    }
    return { input: rgba, options: { raw: { width, height, channels: 4 } } }
  }
  throw Error('No ICO frame >=48px')
}
async function image(buffer) {
  const frame = icoFrame(buffer)
  const pipeline = sharp(frame?.input || buffer, frame?.options)
  const metadata = await pipeline.metadata()
  if (!metadata.width || !metadata.height) throw Error('Unknown image dimensions')
  return { pipeline, width: metadata.width, height: metadata.height }
}
async function fingerprint(buffer) {
  const { pipeline } = await image(buffer)
  return pipeline.resize(32, 32, { fit: 'contain', background: '#00000000' }).ensureAlpha().raw().toBuffer()
}
let globe
async function googleIcon(domain) {
  if (globe === undefined) {
    try {
      const result = await request('https://www.google.com/s2/favicons?domain=finn-no-company-logo-7a9b.invalid&sz=128', true)
      globe = { hash: sha(result.buffer), pixels: await fingerprint(result.buffer) }
    } catch { globe = null }
  }
  if (!globe) throw Error('No safe Google placeholder reference')
  const result = await request(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`)
  const pixels = await fingerprint(result.buffer)
  const distance = pixels.reduce((sum, value, index) => sum + Math.abs(value - globe.pixels[index]), 0) / pixels.length
  if (sha(result.buffer) === globe.hash || distance < 2) throw Error('Google generic globe rejected')
  return result
}
// Last resort (build time only): the company's official logo image from Wikidata (P154), served by Wikimedia Commons.
const commonsFiles = JSON.parse(await fs.readFile(path.join(here, 'logo-commons-files.json'), 'utf8').catch(() => '{}'))   // explicit, reviewed file names
const wikiTitles = JSON.parse(await fs.readFile(path.join(here, 'logo-wikipedia.json'), 'utf8').catch(() => '{}'))
// Wide wordmarks are unreadable in a 32px square: for these, keep only the emblem at the left (a square of the logo's height).
const cropEmblem = new Set(['HDFCBANK', 'PERSISTENT', 'SBIN', 'MARUTI'])
async function wikiLogo(symbol) {
  const title = wikiTitles[symbol]
  if (!title) throw Error('No Wikipedia title configured')
  const page = JSON.parse((await request('https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&titles=' + encodeURIComponent(title))).buffer.toString('utf8'))
  const item = Object.values(page.query?.pages || {})[0]?.pageprops?.wikibase_item
  if (!item) throw Error('No Wikidata item for ' + title)
  const data = JSON.parse((await request('https://www.wikidata.org/wiki/Special:EntityData/' + item + '.json')).buffer.toString('utf8'))
  const claims = data.entities?.[item]?.claims || {}
  let pick = commonsFiles[symbol] || ['P154', 'P8972', 'P2910'].map(p => claims[p]?.[0]?.mainsnak?.datavalue?.value).find(Boolean)
  if (!pick) {   // no logo property: use the article's lead image, but only when its file name says it is a logo
    const lead = JSON.parse((await request('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')))).buffer.toString('utf8'))
    const src = lead.originalimage?.source || ''
    const name = decodeURIComponent(src.split('/').pop() || '')
    if (!/logo|emblem|wordmark|symbol/i.test(name)) throw Error('No logo property and the lead image is not a logo (' + name + ')')
    pick = name
  }
  const asset = await request('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(pick) + '?width=' + (cropEmblem.has(symbol) ? 1024 : 256))
  return { ...asset, wiki: item + ' / ' + pick }
}
// Final fallback: search Wikimedia Commons for a file whose name contains the company name and "logo" (reviewed by eye before committing).
async function commonsSearch(symbol) {
  const title = wikiTitles[symbol]
  const first = title.split(' ')[0].toLowerCase()
  const result = JSON.parse((await request('https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&srsearch=' + encodeURIComponent(title + ' logo'))).buffer.toString('utf8'))
  const names = (result.query?.search || []).map(row => row.title.replace(/^File:/, ''))
  const pick = names.find(name => name.toLowerCase().includes(first) && /logo|emblem/i.test(name) && /.(svg|png)$/i.test(name) && !/old|former|vintage|19dd|20[01]d/i.test(name))
  if (!pick) throw Error('Commons search found no logo file for ' + title)
  const asset = await request('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(pick) + '?width=256')
  return { ...asset, wiki: 'commons-search / ' + pick }
}
await fs.mkdir(output, { recursive: true })
for (const [symbol, domain] of Object.entries(mapping)) {
  if (only && !only.includes(symbol)) continue
  const file = path.join(output, symbol + '.png')
  if (!process.argv.includes('--refresh')) {
    const existing = await fs.readFile(file).catch(() => null)
    const metadata = existing ? await sharp(existing).metadata().catch(() => ({})) : {}
    const cached = reports.get(symbol)
    if (existing && metadata.format === 'png' && metadata.width === 128 && metadata.height === 128 && cached?.domain === domain && cached.source !== 'MISSING' && cached.sha256 === sha(existing)) {
      console.log(`${symbol}\t${domain}\tCACHED\t${existing.length} bytes`); continue
    }
  }
  const errors = []; let page, candidates = []
  for (const home of (wikiOnly ? [] : [`https://${domain}/`, `https://www.${domain}/`])) {
    try { page = await request(home); candidates = pageIcons(page.buffer.toString('utf8'), page.url); break }
    catch (error) { errors.push(`${home}: ${error.message}`) }
  }
  const base = page?.url || `https://${domain}/`
  candidates.push({ url: new URL('/apple-touch-icon.png', base).href }, { url: new URL('/favicon.ico', base).href })
  let saved
  const seen = new Set()
  const googleDomains = [...new Set([domain, new URL(base).hostname, domain.startsWith('www.') ? domain : 'www.' + domain])]
  for (const candidate of (wikiOnly ? [] : [...candidates, ...googleDomains.map(googleDomain => ({ google: true, googleDomain }))])) {
    if (candidate.url && seen.has(candidate.url)) continue
    seen.add(candidate.url)
    try {
      const asset = candidate.google ? await googleIcon(candidate.googleDomain) : await request(candidate.url)
      const { pipeline, width, height } = await image(asset.buffer)
      if (Math.min(width, height) < 48) throw Error(`Too small (${width}x${height})`)
      const png = await pipeline.resize(116, 116, { fit: 'contain', background: '#00000000' })
        .extend({ top: 6, right: 6, bottom: 6, left: 6, background: '#00000000' }).png({ compressionLevel: 9, palette: true, effort: 10 }).toBuffer()
      await fs.writeFile(file, png)
      saved = { symbol, domain, page: page?.url || null, pageTitle: page?.buffer.toString('utf8').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() || null,
        source: asset.url, via: candidate.google ? 'google-fallback' : 'company-site', original: `${width}x${height}`, size: '128x128', bytes: png.length, sha256: sha(png), fetchedAt: new Date().toISOString(), errors }
      break
    } catch (error) { errors.push(`${candidate.google ? 'Google ' + candidate.googleDomain : candidate.url}: ${error.message}`) }
  }
  if (!saved && wikiTitles[symbol]) {
    try {
      const asset = await wikiLogo(symbol).catch(async firstError => { try { return await commonsSearch(symbol) } catch (secondError) { throw Error(firstError.message + '; ' + secondError.message) } })
      let { pipeline, width, height } = await image(asset.buffer)
      if (cropEmblem.has(symbol) && width > height * 1.6) { pipeline = pipeline.extract({ left: 0, top: 0, width: height, height }); width = height }
      if (Math.min(width, height) < 48) throw Error(`Too small (${width}x${height})`)
      const png = await pipeline.resize(116, 116, { fit: 'contain', background: '#00000000' })
        .extend({ top: 6, right: 6, bottom: 6, left: 6, background: '#00000000' }).png({ compressionLevel: 9, palette: true, effort: 10 }).toBuffer()
      await fs.writeFile(file, png)
      saved = { symbol, domain, page: null, pageTitle: wikiTitles[symbol], source: asset.url, via: 'wikidata-commons (' + asset.wiki + ')', original: `${width}x${height}`, size: '128x128', bytes: png.length, sha256: sha(png), fetchedAt: new Date().toISOString(), errors }
    } catch (error) { errors.push('Wikidata/Commons: ' + error.message) }
  }
  if (!saved) { await fs.rm(file, { force: true }); saved = { symbol, domain, page: page?.url || null, pageTitle: page?.buffer.toString('utf8').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() || null, source: 'MISSING', bytes: 0, errors } }
  reports.set(symbol, saved)
  await fs.writeFile(reportPath, JSON.stringify([...reports.values()], null, 2) + '\n')
  console.log(`${symbol}\t${domain}\t${saved.source}\t${saved.original || 'MISSING'} -> ${saved.size || '-'}\t${saved.bytes} bytes`)
}
console.log('MISSING:', [...reports.values()].filter(row => row.source === 'MISSING').map(row => row.symbol).join(', ') || 'none')

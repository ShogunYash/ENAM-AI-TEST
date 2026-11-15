// Local logo delivery, logo/person anatomy, failed-image memory and origin privacy.
import fs from 'node:fs'
import { browser, check, wait } from './lib/browser.js'
const dev = process.env.FINN_DEV_URL || 'http://localhost:5199/?nosplash'
const origin = new URL(dev).origin
const domains = JSON.parse(fs.readFileSync(new URL('./logo-domains.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
const available = Object.keys(domains).filter(symbol => fs.existsSync(new URL(`../public/logos/${symbol}.png`, import.meta.url)))
const tracked = JSON.parse(fs.readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8'))
check('Mapping covers all 27 tracked companies', Object.keys(domains).length === 27 && [...tracked.portfolio, ...tracked.watchlist].every(row => row.nse_symbol in domains))
for (const symbol of available) {
  const response = await fetch(`${origin}/logos/${symbol}.png`)
  const bytes = Buffer.from(await response.arrayBuffer())
  check(`${symbol} is served locally as 128x128 PNG`, response.status === 200 && response.headers.get('content-type')?.includes('image/png') && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.readUInt32BE(16) === 128 && bytes.readUInt32BE(20) === 128)
}
const session = await browser(Number(process.env.FINN_CDP_PORT || 9375))
const { send, ev, until, ws } = session
const requests = [], errors = []
let blocked = 0
const observe = async event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push('console.error')
  if (message.method === 'Fetch.requestPaused') {
    blocked++
    try { await send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'BlockedByClient' }) }
    catch (error) { errors.push(error.message) }
  }
}
ws.addEventListener('message', observe)
const sample = tracked.portfolio.map(row => row.nse_symbol).find(symbol => available.includes(symbol))
const inspect = async (selector, label) => {
  await until(`!!document.querySelector(${JSON.stringify(selector)})`, label + ' mark')
  await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`)
  if (sample) {
    await until(`(()=>{const mark=document.querySelector(${JSON.stringify(selector)});const image=mark?.querySelector('img');return image && image.complete && image.naturalWidth===128})()`, label + ' loaded logo')
    check(label + ' uses local decorative logo', await ev(`(()=>{const image=document.querySelector(${JSON.stringify(selector)}).querySelector('img');return image.getAttribute('src')==='/logos/${sample}.png' && image.alt==='' && image.getAttribute('loading')==='lazy' && image.getAttribute('decoding')==='async'})()`))
  }
  check(label + ' has no 360px horizontal scroll', await ev('document.documentElement.scrollWidth===innerWidth'))
}
try {
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Page.navigate', { url: origin + '/?nosplash' })
  await until(`!!document.querySelector('.finn-app-shell')`, 'initial app')
  const api = await ev(`import('/src/api/client.ts').then(module=>module.API_BASE)`)
  for (const skin of ['light', 'dark', 'terminal']) {
    await ev(`localStorage.setItem('finn.theme','${skin}');localStorage.setItem('finn.todayView','company_az');localStorage.removeItem('finn.today.company');localStorage.removeItem('finn.research.company');localStorage.setItem('finn.researchScope','portfolio')`)
    await send('Page.navigate', { url: origin + `/?nosplash&window=7d&view=company_az&logo=${skin}#today` })
    await until(`!!document.querySelector('section[aria-label=Companies]')`, 'Today companies')
    const selector = `section[aria-label=Companies] .desk-identity-company[data-company-symbol="${sample || 'TCS'}"]`
    await inspect(selector, skin + ' Today company list')
    check(skin + ' company tile stays light and 32px', await ev(`(()=>{const tile=document.querySelector(${JSON.stringify(selector)});const rect=tile.getBoundingClientRect();return getComputedStyle(tile).backgroundColor==='rgb(255, 255, 255)' && rect.width===32 && rect.height===32})()`))
    await ev(`document.querySelector(${JSON.stringify(selector)}).closest('button').click()`)
    await until(`!!document.querySelector('h1 .desk-identity-company')`, 'company header')
    await inspect('h1 .desk-identity-company', skin + ' company page')
    await send('Page.navigate', { url: origin + `/?nosplash&logo=${skin}-research#research` })
    await until(`!!document.querySelector('input[placeholder="Search any NSE ticker"]')`, 'Research list')
    const researchSelector = `.desk-identity-company[data-company-symbol="${sample || 'TCS'}"]`
    await inspect(researchSelector, skin + ' Research list')
    await ev(`document.querySelector('nav button[data-nav-tab=network]').click()`)
    await until(`!!document.querySelector('.desk-identity-person')`, 'person marks')
    check(skin + ' people remain circular text initials', await ev(`Array.from(document.querySelectorAll('.desk-identity-person')).every(mark=>!mark.querySelector('img') && !!mark.textContent.trim() && (parseFloat(getComputedStyle(mark).borderRadius)>=mark.getBoundingClientRect().width/2 || getComputedStyle(mark).borderRadius==='50%'))`))
  }
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/logos/TCS.png', requestStage: 'Request' }] })
  await ev(`localStorage.setItem('finn.theme','light');localStorage.setItem('finn.todayView','company_az');localStorage.removeItem('finn.today.company');localStorage.removeItem('finn.research.company')`)
  await send('Page.navigate', { url: origin + '/?nosplash&window=7d&view=company_az&logo=blocked#today' })
  const tcs = '.desk-identity-company[data-company-symbol="TCS"]'
  await until(`!!document.querySelector(${JSON.stringify(tcs)})`, 'TCS mark')
  await ev(`document.querySelector(${JSON.stringify(tcs)}).scrollIntoView({block:'center'})`)
  await until(`(()=>{const mark=document.querySelector(${JSON.stringify(tcs)});return mark && !mark.querySelector('img') && mark.textContent.trim()==='T'})()`, 'TCS fallback')
  check('Blocked TCS falls back to initials without layout shift', await ev(`(()=>{const rect=document.querySelector(${JSON.stringify(tcs)}).getBoundingClientRect();return rect.width===32 && rect.height===32 && document.documentElement.scrollWidth===innerWidth})()`))
  const afterFailure = blocked
  await ev(`document.querySelector(${JSON.stringify(tcs)}).closest('button').click()`)
  await until(`!!document.querySelector('h1 .desk-identity-company')`, 'failed-logo company detail')
  await wait(250)
  check('Failed symbol is remembered across new company marks', blocked === afterFailure && await ev(`Array.from(document.querySelectorAll(${JSON.stringify(tcs)})).every(mark=>!mark.querySelector('img'))`))
  check('Fallback was exercised through interception', blocked > 0)
  check('No application console error or exception', errors.length === 0)
  const allowed = new Set([origin, new URL(api, origin).origin])
  const external = requests.filter(url => /^https?:/.test(url) && !allowed.has(new URL(url).origin))
  check('All browser requests stay on app or configured API origin', external.length === 0)
  console.log(`ALL LOGO CHECKS PASSED (${available.length}/27 local PNGs; missing symbols use initials)`)
} catch (error) { console.error('[FAIL]', error.message); process.exitCode = 1 }
finally { ws.removeEventListener('message', observe); session.close() }

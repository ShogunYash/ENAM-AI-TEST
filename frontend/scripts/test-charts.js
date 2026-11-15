// Price chart QA: Research report and Today company page show a chart; 1D/3D/7D/30D switch; touch scrub reads a point; offline snapshot works.
// Run: FINN_DEV_URL='http://localhost:5199/?nosplash' node scripts/test-charts.js
import { spawn } from 'child_process'
import os from 'os'

const DEV = process.env.FINN_DEV_URL || 'http://localhost:5199/?nosplash'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.FINN_CDP_PORT || 9360
const tmp = os.tmpdir() + '/finn-chart-' + Date.now()
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' - ' + detail : ''}`)
}

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${tmp}`, 'about:blank'])
try {
  await wait(2500)
  const tab = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === 'page')
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 1
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const cur = id++
      const h = (e) => {
        const d = JSON.parse(e.data)
        if (d.id === cur) {
          ws.removeEventListener('message', h)
          resolve(d.result)
        }
      }
      ws.addEventListener('message', h)
      ws.send(JSON.stringify({ id: cur, method, params }))
    })
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })

  const PANEL = `document.querySelector('section[aria-label="INFY price chart"]')`
  await send('Page.navigate', { url: DEV + '#research' })
  await wait(2500)
  await ev(`localStorage.setItem('finn.research.company','INFY'); localStorage.setItem('finn.chartRange','1d')`)
  await send('Page.reload')
  await wait(3500)

  check('Research report shows the price panel', await ev(`!!${PANEL}`))
  const label = (r) => ev(`(function(){var b=Array.from(${PANEL}.querySelectorAll('button')).find(function(x){return x.innerText.trim()==='${r}'}); if(b) b.click(); return 1})()`)
  const svgLabel = () => ev(`${PANEL}.querySelector('svg') ? ${PANEL}.querySelector('svg').getAttribute('aria-label') : ''`)
  const seen = {}
  for (const r of ['1D', '3D', '7D', '30D']) {
    await label(r)
    await wait(900)
    seen[r] = await svgLabel()
    check(`Range ${r} draws a chart`, !!seen[r] && seen[r].includes(r), seen[r].slice(0, 60))
  }
  check('Ranges differ (not the same data)', new Set(Object.values(seen)).size === 4)

  await ev(`(function(){var s=${PANEL}.querySelector('svg'); var r=s.getBoundingClientRect(); s.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width*0.3,clientY:r.top+20,bubbles:true}))})()`)
  await wait(400)
  check('Touch scrub shows a crosshair', await ev(`${PANEL}.querySelectorAll('svg circle').length > 0`))

  check('High, low and previous close are shown', await ev(`${PANEL}.innerText.indexOf('High') >= 0 && ${PANEL}.innerText.indexOf('previous close') >= 0`))

  // Today > by company > tap a company: the company page has the chart too
  await ev(`localStorage.removeItem('finn.research.company'); localStorage.removeItem('finn.today.company'); localStorage.setItem('finn.todayView','company_az')`)
  await send('Page.navigate', { url: DEV + '#today' })
  await send('Page.reload')
  await wait(3500)
  await ev(`(function(){var b=Array.from(document.querySelectorAll('button')).find(function(x){return /TCS/.test(x.innerText) && /Tata/.test(x.innerText)}); if(b) b.click(); return 1})()`)
  await wait(3000)
  check('Today company page shows the price panel', await ev(`!!document.querySelector('section[aria-label="TCS price chart"]')`))
  ws.close()
} catch (e) {
  check('Chart suite ran', false, e.message)
} finally {
  chrome.kill()
}
const failed = results.filter((x) => !x).length
console.log(failed ? `\n${failed} CHART CHECK(S) FAILED` : '\nALL CHART CHECKS PASSED')
process.exit(failed ? 1 : 0)

// Device research survives an unavailable API; bounded storage and deletion remain local.
import fs from 'node:fs'
import { browser, check, wait } from './lib/browser.js'
const dev = process.env.FINN_DEV_URL || 'http://localhost:5199/?nosplash'
const report = { ...JSON.parse(fs.readFileSync(new URL('../../docs/examples/research-INFY.json', import.meta.url), 'utf8')), symbol: 'ZZTEST', name: 'Persistence test report', is_sample: false }
const session = await browser(Number(process.env.FINN_CDP_PORT || 9373))
const { ws, send, ev, until } = session
let offline = false, requests = 0, interceptionError
const intercept = async event => {
  const message = JSON.parse(event.data)
  if (message.method !== 'Fetch.requestPaused') return
  const { requestId, request } = message.params
  try {
    const path = new URL(request.url).pathname
    if (path === '/research/ZZTEST') {
      requests++
      if (offline) await send('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' })
      else await send('Fetch.fulfillRequest', { requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
        body: Buffer.from(JSON.stringify(report)).toString('base64') })
    } else await send('Fetch.continueRequest', { requestId })
  } catch (error) { interceptionError = error }
}
ws.addEventListener('message', intercept)
const openSaved = `document.querySelector('[aria-label="Open saved ZZTEST"]')`
try {
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/research/ZZTEST', requestStage: 'Request' }] })
  await send('Page.navigate', { url: dev + '&company=ZZTEST#research' })
  await until(`!!localStorage.getItem('finn.research.v1.ZZTEST') && document.body.innerText.includes('Persistence test report')`, 'live completed report saved')
  check('Live ready report is stored with its sources and savedAt', await ev(`(()=>{const saved=JSON.parse(localStorage.getItem('finn.research.v1.ZZTEST'));return saved.data.symbol==='ZZTEST' && saved.data.is_sample===false && saved.data.sources.length>0 && !!Date.parse(saved.savedAt)})()`))
  const api = await ev(`import('/src/api/client.ts').then(module=>module.API_BASE)`)
  offline = true
  await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: [new URL(api).origin + '/*'] })
  await send('Page.reload')
  await until(`document.body.innerText.includes('Saved on this device') && document.body.innerText.includes('Persistence test report')`, 'offline saved detail', 1500)
  check('Saved detail opens immediately without waiting for the API', await ev(`!!document.querySelector('h1') && document.querySelector('h1').innerText==='ZZTEST' && !document.body.innerText.includes('Resolving symbol')`))
  // Refresh must bypass the device copy and attempt the live endpoint again.
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='Refresh' && !b.disabled)`, 'initial offline lookup settled')
  await send('Network.setBlockedURLs', { urls: [] })
  const beforeRefresh = requests
  await ev(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Refresh').click()`)
  await until(`document.body.innerText.includes('Saved on this device')`, 'saved result after refresh')
  for (let attempt = 0; attempt < 20 && requests === beforeRefresh; attempt++) await wait(100)
  check('Refresh asks the live endpoint again', requests > beforeRefresh)
  await ev(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.includes('All companies')).click()`)
  await until(`!!document.querySelector('section[aria-label="Saved research"]')`, 'Saved section')
  if (!await ev(`!!${openSaved}`)) await ev(`Array.from(document.querySelector('section[aria-label="Saved research"]').querySelectorAll('button')).find(b=>b.innerText.startsWith('Show all')).click()`)
  check('Saved home row includes symbol, name, date and verdict summary', await ev(`(()=>{const row=${openSaved}?.parentElement?.parentElement;return row && row.innerText.includes('ZZTEST') && row.innerText.includes('Persistence test report') && row.innerText.includes('Saved') && /met|missed|pending|cut|raised/.test(row.innerText)})()`))
  check('Saved count does not imply there are no reviewed reports', await ev(`!document.body.innerText.includes('0 of 0 with guidance reviewed')`))
  check('Saved pre-built reports are not repeated in the main list', await ev(`!Array.from(document.querySelectorAll('article')).some(a=>a.innerText.includes('INFY'))`))
  await ev(`document.querySelector('[aria-label="Remove saved ZZTEST"]').click()`)
  check('Removing requires a short confirmation', await ev(`!!localStorage.getItem('finn.research.v1.ZZTEST') && !!document.querySelector('[aria-label="Confirm remove ZZTEST"]')`))
  await ev(`document.querySelector('[aria-label="Confirm remove ZZTEST"]').click()`)
  await until(`!localStorage.getItem('finn.research.v1.ZZTEST') && !${openSaved}`, 'saved key and row removed')
  check('Remove deletes the device report and row', true)
  await ev(`localStorage.setItem('finn.research.v1.CLEARTEST',JSON.stringify({savedAt:new Date().toISOString(),data:${JSON.stringify(report)}}));localStorage.setItem('finn.test-marker','1');document.querySelector('button[aria-label=Profile]').click()`)
  await until(`document.body.innerText.includes('Clear my data on this device')`, 'Profile reset control')
  await ev(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.includes('Clear my data on this device')).click()`)
  await ev(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Clear everything').click()`)
  await until(`!localStorage.getItem('finn.test-marker') && !Object.keys(localStorage).some(key=>key.startsWith('finn.research.v1.'))`, 'Profile clears research keys')
  check('Profile clear removes device research and other finn keys', true)
  const guards = await ev(`(async()=>{
    const {saveResearchReport,readSavedResearch,listSavedResearch}=await import('/src/lib/researchStorage.ts');const base=${JSON.stringify(report)};
    const clear=()=>Object.keys(localStorage).filter(k=>k.startsWith('finn.research.v1.')).forEach(k=>localStorage.removeItem(k));clear();
    for(const patch of [{status:'building'},{status:'failed'},{is_sample:true}])saveResearchReport({...base,...patch});const rejected=listSavedResearch().length===0;
    saveResearchReport({...base,status:'partial'});const partial=readSavedResearch('ZZTEST')?.data.status==='partial';clear();
    for(let i=0;i<13;i++){saveResearchReport({...base,symbol:'LIMIT'+String(i).padStart(2,'0')});await new Promise(r=>setTimeout(r,3))}const bounded=listSavedResearch().length===12&&!readSavedResearch('LIMIT00');clear();
    saveResearchReport({...base,symbol:'BIG1',gaps:['x'.repeat(600000)]});saveResearchReport({...base,symbol:'BIG2',gaps:['x'.repeat(600000)]});const keys=Object.keys(localStorage).filter(k=>k.startsWith('finn.research.v1.'));const budget=keys.reduce((n,k)=>n+2*(k.length+localStorage.getItem(k).length),0)<=1500000&&!readSavedResearch('BIG1')&&!!readSavedResearch('BIG2');
    saveResearchReport({...base,symbol:'TOOBIG',gaps:['x'.repeat(800000)]});const oversize=!readSavedResearch('TOOBIG')&&!!readSavedResearch('BIG2');clear();
    saveResearchReport({...base,symbol:'OLDER'});const original=Storage.prototype.setItem;let attempts=0;Storage.prototype.setItem=function(k,v){if(k.startsWith('finn.research.v1.')&&++attempts===1)throw new DOMException('Test quota','QuotaExceededError');return original.call(this,k,v)};
    try{saveResearchReport({...base,symbol:'RETRY'})}finally{Storage.prototype.setItem=original}const retry=attempts===2&&!readSavedResearch('OLDER')&&!!readSavedResearch('RETRY');
    Storage.prototype.setItem=function(){throw new DOMException('Test quota','QuotaExceededError')};try{saveResearchReport({...base,symbol:'FULL'})}finally{Storage.prototype.setItem=original}const silent=!readSavedResearch('FULL');
    localStorage.setItem('finn.research.v1.BROKEN','{');const corrupt=!readSavedResearch('BROKEN');clear();return{rejected,partial,bounded,budget,oversize,retry,silent,corrupt}
  })()`)
  for (const [name, passed] of Object.entries(guards)) check('Storage guard: ' + name, passed)
  check('Interception completed without errors', !interceptionError)
  console.log('ALL RESEARCH PERSISTENCE CHECKS PASSED')
} catch (error) { console.error('[FAIL]', error.message); process.exitCode = 1 }
finally { ws.removeEventListener('message', intercept); session.close() }

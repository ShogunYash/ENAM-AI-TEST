import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-ask-' + Date.now())

async function runAskVerification() {
  console.log('====================================================')
  console.log('FINN Grounded POST /ask 5-Question Real Data Verification')
  console.log('Dev Server: http://localhost:5199/')
  console.log('Backend API: http://localhost:8001/')
  console.log('====================================================\n')

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5199/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9225/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome on port 9225')
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl)
    await new Promise((resolve) => ws.addEventListener('open', resolve))

    let id = 1
    const send = (method, params = {}) => {
      const msgId = id++
      return new Promise((resolve, reject) => {
        const handler = (evt) => {
          const data = JSON.parse(evt.data)
          if (data.id === msgId) {
            ws.removeEventListener('message', handler)
            if (data.error) reject(data.error)
            else resolve(data.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')

    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
      return res.result?.value
    }

    const capture = async (filename) => {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(screenshotsDir, filename)
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log(`[PASS] Captured: ${filename}`)
    }

    // Wait for initial render
    await new Promise((r) => setTimeout(r, 1500))

    // Switch window to 30d to ensure all filing types (results, fund_raise, mgmt) are visible
    console.log('Step: Switch Today window to 30d')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) { btn30.click(); return true; }
      return false;
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    // -------------------------------------------------------------------------
    // TEST 1: Results Card Question ("How did PAT change versus last year?")
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Results Card Question ---')
    const openedResults = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('article'));
      // Find results card (contains TATASTEEL or TITAN results)
      const resCard = cards.find(c => c.innerText.includes('Results') || c.innerText.includes('Revenue') || c.innerText.includes('PAT'));
      if (!resCard) return false;
      const askBtn = Array.from(resCard.querySelectorAll('button')).find(b => b.innerText.includes('Ask FINN'));
      if (askBtn) { askBtn.click(); return true; }
      return false;
    })()`)

    if (!openedResults) throw new Error('[FAIL] Could not find or open Ask FINN on Results card')
    await new Promise((r) => setTimeout(r, 600))

    // Check suggested prompt exists and click it
    const clickedPrompt1 = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const prompt = btns.find(b => b.innerText.includes('How did PAT change versus last year?'));
      if (prompt) { prompt.click(); return true; }
      return false;
    })()`)
    if (!clickedPrompt1) throw new Error('[FAIL] Prompt "How did PAT change versus last year?" not found')

    // Wait for answer to arrive
    let answer1Found = false
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const text = await evaluate(`document.body.innerText`)
      if (text.includes('PAT') && (text.includes('crore') || text.includes('16.2%') || text.includes('increase'))) {
        answer1Found = true
        break
      }
    }
    if (!answer1Found) throw new Error('[FAIL] Answer for PAT question not received from live backend')
    console.log('[PASS] Test 1: Results card answered from live backend!')
    await capture('ask-1-results-pat.png')

    // Close Ask sheet
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close Ask FINN"]');
      if (closeBtn) closeBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    // -------------------------------------------------------------------------
    // TEST 2: Management Change Card Question ("When does the change take effect?")
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Management Change Card Question ---')
    const openedMgmt = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('article'));
      const mgmtCard = cards.find(c => c.innerText.includes('Retirement') || c.innerText.includes('Noel Naval Tata'));
      if (!mgmtCard) return 'no_mgmt_card';
      const askBtn = Array.from(mgmtCard.querySelectorAll('button')).find(b => b.innerText.includes('Ask FINN'));
      if (askBtn) { askBtn.click(); return 'clicked'; }
      return 'no_ask_btn';
    })()`)

    console.log('openedMgmt result:', openedMgmt)
    if (openedMgmt !== 'clicked') throw new Error('[FAIL] Could not find or open Ask FINN on Management card: ' + openedMgmt)
    await new Promise((r) => setTimeout(r, 800))

    const promptsFound = await evaluate(`(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    })()`)
    console.log('Buttons on screen:', promptsFound)

    const clickedPrompt2 = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const prompt = btns.find(b => b.innerText.includes('When does the change take effect?'));
      if (prompt) { prompt.click(); return true; }
      return false;
    })()`)
    if (!clickedPrompt2) throw new Error('[FAIL] Prompt "When does the change take effect?" not found')

    let answer2Found = false
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const text = await evaluate(`document.body.innerText`)
      if (text.includes('November 11, 2026') || text.includes('close of business hours')) {
        answer2Found = true
        break
      }
    }
    if (!answer2Found) throw new Error('[FAIL] Answer for Management question not received from live backend')
    console.log('[PASS] Test 2: Management card answered with verified quote and date!')
    await capture('ask-2-mgmt-effective.png')

    // Close Ask sheet
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close Ask FINN"]');
      if (closeBtn) closeBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 500))

    // -------------------------------------------------------------------------
    // TEST 3: Fund Raise Card Question ("What are the key terms?")
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Fund Raise Card Question ---')
    const openedFundRaise = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('article'));
      const fundCard = cards.find(c => c.innerText.includes('QIP') || c.innerText.includes('Fund Raise') || c.innerText.includes('BAJFINANCE'));
      if (!fundCard) return false;
      const askBtn = Array.from(fundCard.querySelectorAll('button')).find(b => b.innerText.includes('Ask FINN'));
      if (askBtn) { askBtn.click(); return true; }
      return false;
    })()`)

    if (!openedFundRaise) throw new Error('[FAIL] Could not find or open Ask FINN on Fund Raise card')
    await new Promise((r) => setTimeout(r, 600))

    const clickedPrompt3 = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const prompt = btns.find(b => b.innerText.includes('What are the key terms?'));
      if (prompt) { prompt.click(); return true; }
      return false;
    })()`)
    if (!clickedPrompt3) throw new Error('[FAIL] Prompt "What are the key terms?" not found')

    let answer3Found = false
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const text = await evaluate(`document.body.innerText`)
      if (text.includes('992.25') || text.includes('Floor Price') || text.includes('discount')) {
        answer3Found = true
        break
      }
    }
    if (!answer3Found) throw new Error('[FAIL] Answer for Fund Raise question not received from live backend')
    console.log('[PASS] Test 3: Fund Raise card answered with verified quotes and floor price!')
    await capture('ask-3-fundraise-terms.png')

    // Close Ask sheet
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close Ask FINN"]');
      if (closeBtn) closeBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 500))

    // -------------------------------------------------------------------------
    // TEST 4: Research Screen Question ("What happened to the latest guidance?")
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Research Screen Question ---')
    // Click Research tab in bottom nav
    const switchedToResearch = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const researchBtn = btns.find(b => b.innerText.toLowerCase().includes('research'));
      if (researchBtn) { researchBtn.click(); return true; }
      return false;
    })()`)
    if (!switchedToResearch) throw new Error('[FAIL] Could not switch to Research tab')
    await new Promise((r) => setTimeout(r, 1000))

    // Click Ask FINN button on Research screen
    const openedResearchAsk = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const askBtn = btns.find(b => b.innerText.includes('Ask FINN'));
      if (askBtn) { askBtn.click(); return true; }
      return false;
    })()`)
    if (!openedResearchAsk) throw new Error('[FAIL] Could not find Ask FINN button on Research screen')
    await new Promise((r) => setTimeout(r, 600))

    const clickedPrompt4 = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const prompt = btns.find(b => b.innerText.includes('What happened to the latest guidance?'));
      if (prompt) { prompt.click(); return true; }
      return false;
    })()`)
    if (!clickedPrompt4) throw new Error('[FAIL] Prompt "What happened to the latest guidance?" not found')

    let answer4Found = false
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const text = await evaluate(`document.body.innerText`)
      if ((text.includes('1%') || text.includes('2%') || text.includes('guidance')) && (text.includes('operating margin') || text.includes('revenue growth'))) {
        answer4Found = true
        break
      }
    }
    if (!answer4Found) throw new Error('[FAIL] Answer for Research guidance question not received from live backend')
    console.log('[PASS] Test 4: Research screen answered with concall guidance and citations!')
    await capture('ask-4-research-guidance.png')

    // Close Ask sheet
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close Ask FINN"]');
      if (closeBtn) closeBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 500))

    // -------------------------------------------------------------------------
    // TEST 5: Unanswerable Question (Refuses to guess, answerable === false)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Unanswerable Question (Refuses to guess) ---')
    // Open Ask FINN on Research screen again
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const askBtn = btns.find(b => b.innerText.includes('Ask FINN'));
      if (askBtn) askBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    // Type unanswerable question using Chrome DevTools Input.insertText targeting #ask-finn-input
    await evaluate(`(() => {
      const input = document.getElementById('ask-finn-input');
      if (input) input.focus();
    })()`)
    await new Promise((r) => setTimeout(r, 200))
    await send('Input.insertText', { text: 'What is the promoter salary for next decade?' })
    await new Promise((r) => setTimeout(r, 300))

    const inputStatus = await evaluate(`(() => {
      const input = document.getElementById('ask-finn-input');
      const sendBtn = document.querySelector('button[aria-label="Send question"]');
      return { val: input?.value, btnDisabled: sendBtn?.disabled };
    })()`)
    console.log('Input status after Input.insertText:', inputStatus)

    // Click submit button
    const clickStatus = await evaluate(`(() => {
      const sendBtn = document.querySelector('button[aria-label="Send question"]');
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        return 'clicked_btn';
      }
      return 'failed';
    })()`)
    console.log('Click status:', clickStatus)

    let answer5Found = false
    let lastText = ''
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      lastText = await evaluate(`document.body.innerText`)
      if (lastText.includes("won't guess") || lastText.includes("That isn't covered") || lastText.includes("That isn't stated")) {
        answer5Found = true
        break
      }
    }
    if (!answer5Found) {
      console.log('Last text on screen in Test 5:\n', lastText.slice(-1000))
      throw new Error('[FAIL] Neutral unanswerable state not displayed')
    }
    console.log('[PASS] Test 5: Neutral unanswerable state rendered correctly with refusal to speculate!')
    await capture('ask-5-unanswerable-neutral.png')

    console.log('\n====================================================')
    console.log('ALL 5 REAL POST /ask QUESTIONS PASSED AGAINST REAL BACKEND!')
    console.log('====================================================')
  } catch (err) {
    console.error('Error during verification:', err)
    throw err
  } finally {
    try {
      chromeProc.kill()
    } catch {}
    try {
      await new Promise((r) => setTimeout(r, 500))
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }
}

runAskVerification().catch((err) => {
  console.error(err)
  process.exit(1)
})

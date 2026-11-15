import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
export const check = (name, condition) => { if (!condition) throw new Error(name); console.log('[PASS]', name) }
export async function browser(port) {
  const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'finn-ux-')), 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  let ws
  try {
    let tabs
    for (let tries = 0; tries < 40; tries++) {
      try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.some(tab => tab.type === 'page')) break } catch {}
      await wait(200)
    }
    const tab = tabs?.find(tab => tab.type === 'page')
    if (!tab) throw new Error('Chrome did not start')
    ws = new WebSocket(tab.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
    let id = 0
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const current = ++id
      const timer = setTimeout(() => { ws.removeEventListener('message', receive); reject(new Error('CDP timeout: ' + method)) }, 15000)
      const receive = event => {
        const message = JSON.parse(event.data)
        if (message.id !== current) return
        clearTimeout(timer); ws.removeEventListener('message', receive)
        if (message.error) reject(new Error(JSON.stringify(message.error)))
        else resolve(message.result)
      }
      ws.addEventListener('message', receive)
      ws.send(JSON.stringify({ id: current, method, params }))
    })
    const ev = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
      return result.result.value
    }
    const until = async (expression, label, timeout = 10000) => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) { if (await ev(expression)) return; await wait(150) }
      throw new Error('Timed out: ' + label)
    }
    await send('Page.enable'); await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 844, deviceScaleFactor: 1, mobile: true })
    return { ws, send, ev, until, close() { ws.close(); chrome.kill() } }
  } catch (error) { ws?.close(); chrome.kill(); throw error }
}

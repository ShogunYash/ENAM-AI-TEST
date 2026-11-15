// Fresh profile, accessible look choice, device persistence and migration/bypass.
import { browser, check, wait } from './lib/browser.js'
const dev = (process.env.FINN_DEV_URL || 'http://localhost:5199/?nosplash').split('?')[0]
const session = await browser(Number(process.env.FINN_CDP_PORT || 9372))
const { send, ev, until } = session
const chooser = `document.querySelector('[role=dialog][aria-labelledby="look-title"]')`
try {
  await send('Page.navigate', { url: dev })
  await until(`!!${chooser}`, 'fresh profile chooser after opening animation')
  check('Fresh device shows Choose your look', await ev(`!!${chooser} && document.body.innerText.includes('Choose your look')`))
  check('Chooser chrome is not selectable', await ev(`getComputedStyle(${chooser}).userSelect==='none'`))
  check('Focus starts in selected radio', await ev(`document.activeElement.getAttribute('role')==='radio' && document.activeElement.getAttribute('aria-checked')==='true'`))
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  check('Arrow selects Dark and previews immediately', await ev(`document.activeElement.innerText.includes('Dark') && document.activeElement.getAttribute('aria-checked')==='true' && document.documentElement.classList.contains('dark')`))
  check('Preview has not saved before Continue', await ev(`!localStorage.getItem('finn.theme') && !localStorage.getItem('finn.onboarded')`))
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
  check('Escape leaves chooser open', await ev(`!!${chooser}`))
  await ev(`Array.from(${chooser}.querySelectorAll('button')).find(b=>b.innerText==='Continue').focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' })
  check('Tab traps focus in dialog', await ev(`document.activeElement.getAttribute('role')==='radio'`))
  check('No 360px overflow and cards/Continue have 44px targets', await ev(`document.documentElement.scrollWidth===innerWidth && [...${chooser}.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44)`))
  await ev(`Array.from(${chooser}.querySelectorAll('button')).find(b=>b.innerText==='Continue').click()`)
  await until(`!${chooser} && !!document.querySelector('.finn-app-shell')`, 'Continue opens app')
  check('Continue saves both keys and applies Dark', await ev(`localStorage.getItem('finn.theme')==='dark' && localStorage.getItem('finn.onboarded')==='1' && document.documentElement.classList.contains('dark')`))
  await send('Page.reload'); await wait(2800)
  check('Reload skips chooser and keeps Dark', await ev(`!${chooser} && document.documentElement.classList.contains('dark')`))
  await ev(`localStorage.clear();localStorage.setItem('finn.theme','terminal')`)
  await send('Page.reload'); await wait(2800)
  check('Existing theme alone skips onboarding', await ev(`!${chooser} && document.documentElement.classList.contains('terminal')`))
  await ev('localStorage.clear()')
  await send('Page.navigate', { url: dev + '?nosplash&company=INFY#research' })
  await until(`!!document.querySelector('.selectable')`, 'research evidence')
  check('?nosplash skips chooser on fresh device', await ev(`!${chooser} && !localStorage.getItem('finn.onboarded')`))
  check('Chrome translation opt-outs and zoom preserved', await ev(`document.documentElement.getAttribute('translate')==='no' && document.querySelector('meta[name=google]').content==='notranslate' && document.querySelector('#root').classList.contains('notranslate') && !/user-scalable=no|maximum-scale/.test(document.querySelector('meta[name=viewport]').content)`))
  check('App chrome is not selectable; input/evidence are selectable', await ev(`getComputedStyle(document.querySelector('.finn-app-shell')).userSelect==='none' && getComputedStyle(document.querySelector('input')).userSelect==='text' && getComputedStyle(document.querySelector('.selectable')).userSelect==='text'`))
  console.log('ALL FIRST-RUN CHECKS PASSED')
} catch (error) { console.error('[FAIL]', error.message); process.exitCode = 1 }
finally { session.close() }

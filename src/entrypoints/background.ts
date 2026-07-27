export default defineBackground(() => {
  console.log('[SW] Service worker started')

  try {
    chrome.runtime.onMessage.addListener((msg: any, sender: chrome.runtime.MessageSender, sendResponse: (resp: any) => void) => {
      console.log('[SW] Message received:', msg?.action)

      if (msg.action === 'copy-with-screenshot' && msg.text && msg.rect && sender.tab?.id) {
        console.log('[SW] copy-with-screenshot, rect:', JSON.stringify(msg.rect))
        handleScreenshot(msg, sendResponse)
        return true
      }

      if (msg.action === 'badge-on' && sender.tab?.id) {
        console.log('[SW] badge-on for tab', sender.tab.id)
        chrome.action.setBadgeText({ text: '', tabId: sender.tab.id })
        chrome.action.setBadgeBackgroundColor({ color: '#00e676', tabId: sender.tab.id })
      }

      if (msg.action === 'badge-off' && sender.tab?.id) {
        console.log('[SW] badge-off for tab', sender.tab.id)
        chrome.action.setBadgeText({ text: '', tabId: sender.tab.id })
      }

      if (msg.action === 'get-tab-url' && sender.tab?.id) {
        chrome.tabs.get(sender.tab.id, (tab: chrome.tabs.Tab) => {
          sendResponse({ url: tab.url || null })
        })
        return true
      }
    })
  } catch (e) {
    console.log('[SW] Error adding onMessage listener:', e)
  }

  try {
    chrome.commands.onCommand.addListener((command: string) => {
      console.log('[SW] Command received:', command)
      if (command !== 'toggle-picker') return
      chrome.storage.local.get(['format', 'screenshot', 'screenshotSize'], (res: any) => {
        if (!res) res = {}
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
          const tab = tabs[0]
          if (!tab?.id) return
          const msg = {
            action: 'toggle-picker',
            format: res.format || 'full',
            screenshot: res.screenshot !== false,
            screenshotSize: res.screenshotSize || 'medium',
          }
          sendToAllFrames(tab.id, msg)
        })
      })
    })
  } catch (e) {
    console.log('[SW] Error adding onCommand listener:', e)
  }

  function sendToAllFrames(tabId: number, msg: any) {
    chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
      if (frames) {
        for (const frame of frames) {
          chrome.tabs.sendMessage(tabId, msg, { frameId: frame.frameId }).catch(() => {})
        }
      } else {
        chrome.tabs.sendMessage(tabId, msg).catch(() => {})
      }
    })
  }

  async function handleScreenshot(msg: any, sendResponse: (resp: any) => void) {
    try {
      console.log('[SW] captureVisibleTab...')
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' })
      console.log('[SW] captureVisibleTab OK, dataUrl length:', dataUrl.length)

      console.log('[SW] fetch + createImageBitmap...')
      const resp = await fetch(dataUrl)
      const blob = await resp.blob()
      const img = await createImageBitmap(blob)
      console.log('[SW] ImageBitmap:', img.width, 'x', img.height)

      const rect = msg.rect as { x: number; y: number; width: number; height: number }
      const opts = msg.options || {}
      const scale = opts.scale || 1
      const quality = opts.quality || 0.7
      const w = Math.round(rect.width * scale)
      const h = Math.round(rect.height * scale)

      console.log('[SW] OffscreenCanvas:', w, 'x', h)
      const canvas = new OffscreenCanvas(w, h)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, w, h)

      console.log('[SW] convertToBlob JPEG quality:', quality)
      const out = await canvas.convertToBlob({ type: 'image/jpeg', quality })
      console.log('[SW] JPEG blob size:', out.size)

      const base64 = await new Promise<string | null>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => { console.log('[SW] FileReader error'); resolve(null) }
        reader.readAsDataURL(out)
      })

      if (!base64) {
        console.log('[SW] Crop failed: no base64')
        sendResponse({ text: msg.text, error: 'crop failed' })
        return
      }

      console.log('[SW] Base64 length:', base64.length)
      const finalText = msg.text.replace(
        '--- End Element Info ---',
        '\n\n![Element Screenshot](' + base64 + ')\n--- End Element Info ---'
      )
      console.log('[SW] Sending response with screenshot')
      sendResponse({ text: finalText })
    } catch (e: any) {
      console.log('[SW] Screenshot error:', String(e))
      sendResponse({ text: msg.text, error: String(e) })
    }
  }
})

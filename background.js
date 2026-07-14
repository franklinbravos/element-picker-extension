chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-picker') {
    chrome.storage.sync.get(['format', 'screenshot', 'screenshotSize'], ({ format, screenshot, screenshotSize }) => {
      const fmt = format || 'full'
      const scr = screenshot !== false
      const size = screenshotSize || 'medium'
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggle-picker',
            format: fmt,
            screenshot: scr,
            screenshotSize: size,
          })
        }
      })
    })
  }
})

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'copy-to-clipboard' && msg.text) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            func: (text) => navigator.clipboard.writeText(text),
            args: [msg.text],
          })
          .catch(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'copy-fallback',
              text: msg.text,
            })
          })
      }
    })
  }

  if (msg.action === 'badge-on' && sender.tab?.id) {
    chrome.action.setBadgeText({ text: 'ON', tabId: sender.tab.id })
    chrome.action.setBadgeBackgroundColor({ color: '#00e676', tabId: sender.tab.id })
  }

  if (msg.action === 'badge-off' && sender.tab?.id) {
    chrome.action.setBadgeText({ text: '', tabId: sender.tab.id })
  }

  if (msg.action === 'capture-element' && msg.rect && sender.tab?.id) {
    return (async () => {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' })
        return await cropImage(dataUrl, msg.rect, msg.options)
      } catch (err) {
        return null
      }
    })()
  }
})

async function cropImage(dataUrl, rect, options = {}) {
  const { quality = 0.7, scale = 1 } = options

  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)

  const w = Math.round(rect.width * scale)
  const h = Math.round(rect.height * scale)
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, w, h)

  const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality })

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(croppedBlob)
  })
}

const formatSelect = document.getElementById('format-select')
const screenshotCheckbox = document.getElementById('screenshot-checkbox')
const screenshotSizeSelect = document.getElementById('screenshot-size')
const screenshotSizeField = document.getElementById('screenshot-size-field')
const savedMsg = document.getElementById('saved-msg')

chrome.storage.sync.get(['format', 'screenshot', 'screenshotSize'], (data) => {
  if (data.format) formatSelect.value = data.format
  screenshotCheckbox.checked = data.screenshot !== false
  if (data.screenshotSize) screenshotSizeSelect.value = data.screenshotSize
  screenshotSizeField.style.display = screenshotCheckbox.checked ? 'block' : 'none'
})

function activatePicker() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return
    const msg = {
      action: 'toggle-picker',
      format: formatSelect.value,
      screenshot: screenshotCheckbox.checked,
      screenshotSize: screenshotSizeSelect.value,
    }
    chrome.tabs
      .sendMessage(tab.id, msg)
      .catch(() => {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
          .then(() =>
            chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['content.css'],
            }),
          )
          .then(() =>
            chrome.tabs.sendMessage(tab.id, msg),
          )
      })
  })
}

function sendPrefs(format, screenshot, screenshotSize) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return
    chrome.tabs.sendMessage(tab.id, { action: 'set-prefs', format, screenshot, screenshotSize }).catch(() => {})
  })
}

formatSelect.addEventListener('change', () => {
  const fmt = formatSelect.value
  const scr = screenshotCheckbox.checked
  const size = screenshotSizeSelect.value
  chrome.storage.sync.set({ format: fmt, screenshot: scr, screenshotSize: size }, () => {
    sendPrefs(fmt, scr, size)
    savedMsg.classList.add('show')
    setTimeout(() => savedMsg.classList.remove('show'), 1500)
  })
})

screenshotCheckbox.addEventListener('change', () => {
  const fmt = formatSelect.value
  const scr = screenshotCheckbox.checked
  const size = screenshotSizeSelect.value
  screenshotSizeField.style.display = scr ? 'block' : 'none'
  chrome.storage.sync.set({ screenshot: scr })
  sendPrefs(fmt, scr, size)
})

screenshotSizeSelect.addEventListener('change', () => {
  const fmt = formatSelect.value
  const scr = screenshotCheckbox.checked
  const size = screenshotSizeSelect.value
  chrome.storage.sync.set({ screenshotSize: size })
  sendPrefs(fmt, scr, size)
})

activatePicker()

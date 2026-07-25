const formatSelect = document.getElementById('format-select') as HTMLSelectElement
const screenshotCheckbox = document.getElementById('screenshot-checkbox') as HTMLInputElement
const screenshotSizeSelect = document.getElementById('screenshot-size') as HTMLSelectElement
const screenshotSizeField = document.getElementById('screenshot-size-field') as HTMLElement
const savedMsg = document.getElementById('saved-msg') as HTMLElement
const toggleBtn = document.getElementById('toggle-picker') as HTMLElement
const statusDot = document.getElementById('status-dot') as HTMLElement
const statusText = document.getElementById('status-text') as HTMLElement

let pickerActive = false

toggleBtn.addEventListener('click', togglePicker)

chrome.storage.local.get(['format', 'screenshot', 'screenshotSize', 'pickerActive'], (data: any) => {
  if (!data) data = {}
  if (data.format) formatSelect.value = data.format
  if (data.screenshotSize) screenshotSizeSelect.value = data.screenshotSize
  if (data.screenshot !== undefined) screenshotCheckbox.checked = data.screenshot
  screenshotSizeField.style.display = screenshotCheckbox.checked ? 'block' : 'none'
  if (data.pickerActive) {
    pickerActive = true
    updateUI()
    sendMsg({
      action: 'toggle-picker',
      format: formatSelect.value,
      screenshot: screenshotCheckbox.checked,
      screenshotSize: screenshotSizeSelect.value,
    })
  }
})

function togglePicker() {
  pickerActive = !pickerActive
  chrome.storage.local.set({ pickerActive })
  updateUI()
  sendMsg({
    action: 'toggle-picker',
    format: formatSelect.value,
    screenshot: screenshotCheckbox.checked,
    screenshotSize: screenshotSizeSelect.value,
  })
}

function updateUI() {
  if (pickerActive) {
    toggleBtn.classList.remove('inactive')
    statusDot.style.background = '#00e676'
    statusText.textContent = 'Picker ativo'
  } else {
    toggleBtn.classList.add('inactive')
    statusDot.style.background = ''
    statusText.textContent = 'Desativado'
  }
}

function sendMsg(msg: any) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return
    chrome.tabs.sendMessage(tab.id, msg).catch(() => {})
  })
}

function sendPrefs(format: string, screenshot: boolean, screenshotSize: string) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return
    chrome.tabs.sendMessage(tab.id, { action: 'set-prefs', format, screenshot, screenshotSize }).catch(() => {})
  })
}

formatSelect.addEventListener('change', () => {
  const fmt = formatSelect.value
  const scr = screenshotCheckbox.checked
  const size = screenshotSizeSelect.value
  chrome.storage.local.set({ format: fmt, screenshot: scr, screenshotSize: size }, () => {
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
  chrome.storage.local.set({ screenshot: scr }, () => {
    sendPrefs(fmt, scr, size)
  })
})

screenshotSizeSelect.addEventListener('change', () => {
  const fmt = formatSelect.value
  const scr = screenshotCheckbox.checked
  const size = screenshotSizeSelect.value
  chrome.storage.local.set({ screenshotSize: size }, () => {
    sendPrefs(fmt, scr, size)
  })
})

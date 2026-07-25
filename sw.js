chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.action === 'copy-with-screenshot') {
    chrome.tabs.captureVisibleTab({ format: 'png' }, function(dataUrl) {
      sendResponse({ text: msg.text, error: 'captureVisibleTab callback' })
    })
    return true
  }
})

chrome.commands.onCommand.addListener(function(command) {
  if (command === 'toggle-picker') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var tab = tabs[0]
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle-picker' })
      }
    })
  }
})

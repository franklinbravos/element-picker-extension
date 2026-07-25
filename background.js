chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  sendResponse({ pong: true })
  return true
})
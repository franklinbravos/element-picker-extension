chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-picker') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle-picker' });
      }
    });
  }
});

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
            });
          });
      }
    });
  }
});

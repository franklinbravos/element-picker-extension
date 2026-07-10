const btn = document.getElementById('toggle-btn');
const shortcutEl = document.getElementById('shortcut-display');
const formatSelect = document.getElementById('format-select');

chrome.storage.sync.get(['format'], (data) => {
  if (data.format) formatSelect.value = data.format;
});

formatSelect.addEventListener('change', () => {
  chrome.storage.sync.set({ format: formatSelect.value });
});

btn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-picker' });
    window.close();
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css'],
    });
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-picker' });
    window.close();
  }
});

chrome.commands.getAll((commands) => {
  const toggle = commands.find((c) => c.name === 'toggle-picker');
  if (toggle?.shortcut) {
    shortcutEl.textContent = toggle.shortcut;
  }
});

let active = false
let overlay = null
let tooltip = null
let badge = null
let currentEl = null
let currentFormat = 'full'
let captureScreenshot = true
var screenshotSize = 'medium'

function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = '__el-picker-overlay';
  overlay.style.cssText = `
    position: fixed; pointer-events: none; z-index: 2147483647;
    border: 2px solid #50e1f9; background: rgba(80,225,249,0.12);
    transition: all 0.08s ease; display: none; border-radius: 4px;
  `;
  document.body.appendChild(overlay);
}

function createBadge() {
  badge = document.createElement('div');
  badge.id = '__el-picker-badge';
  badge.style.cssText = `
    position: fixed; bottom: 16px; right: 16px; z-index: 2147483649;
    display: flex; align-items: center; gap: 6px;
    background: #010e24; color: #dbe6ff;
    font: 600 11px/1 system-ui, sans-serif;
    padding: 6px 12px 6px 8px; border-radius: 20px;
    border: 1px solid #3b4861;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    pointer-events: none;
  `;
  const dot = document.createElement('span');
  dot.style.cssText = `
    width: 8px; height: 8px; border-radius: 50%;
    background: #00e676; flex-shrink: 0;
  `;
  const label = document.createElement('span');
  label.textContent = 'Picker ativo';
  badge.appendChild(dot);
  badge.appendChild(label);
  document.body.appendChild(badge);
}

function createTooltip() {
  tooltip = document.createElement('div');
  tooltip.id = '__el-picker-tooltip';
  tooltip.style.cssText = `
    position: fixed; pointer-events: none; z-index: 2147483648;
    background: #010e24; color: #dbe6ff; font: 12px/1.4 monospace;
    padding: 8px 12px; border-radius: 6px; border: 1px solid #3b4861;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5); display: none;
    max-width: 480px; white-space: nowrap;
  `;
  document.body.appendChild(tooltip);
}

function generateSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;

  const path = [];
  let current = el;

  while (current && current !== document.body && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase();
    let selector = tag;

    if (current.id) {
      path.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    if (current.classList.length > 0) {
      const classes = [...current.classList]
        .filter((c) => !c.startsWith('__el-picker'))
        .slice(0, 3)
        .map((c) => `.${CSS.escape(c)}`);
      if (classes.length > 0) selector += classes.join('');
    }

    const parent = current.parentElement;
    if (parent) {
      const children = [...parent.children];
      if (children.length > 1) {
        const idx = children.indexOf(current) + 1;
        selector += `:nth-child(${idx})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

function generateXPath(el) {
  if (el.id) return `//*[@id="${el.id}"]`;

  const parts = [];
  let current = el;

  while (current && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase();
    let part = tag;

    if (current.id) {
      parts.unshift(`//*[@id="${current.id}"]`);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter(
        (s) => s.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        part += `[${idx}]`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

function getElementRole(el) {
  const tag = el.tagName.toLowerCase();
  const roleAttr = el.getAttribute('role');
  const disabled = el.getAttribute('aria-disabled') === 'true' || el.disabled;
  let role = 'generic';
  let interaction = null;

  if (tag === 'a') {
    role = 'link';
  } else if (tag === 'button') {
    role = 'button';
  } else if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['submit', 'reset', 'button'].includes(type)) {
      role = 'button';
    } else if (type === 'checkbox') {
      role = 'checkbox';
    } else if (type === 'radio') {
      role = 'radio';
    } else if (type === 'range') {
      role = 'slider';
    } else if (type === 'number') {
      role = 'spinbutton';
    } else if (type === 'search') {
      role = 'searchbox';
    } else {
      role = 'textbox';
    }
  } else if (tag === 'textarea') {
    role = 'textbox';
  } else if (tag === 'img') {
    role = 'img';
  } else if (tag === 'select') {
    role = 'combobox';
  } else if (/^h[1-6]$/.test(tag)) {
    role = 'heading';
  }

  if (roleAttr) {
    role = roleAttr;
  }

  if (tag === 'a' || tag === 'button' || role === 'link' || role === 'button') {
    interaction = 'clickable';
  } else if (tag === 'textarea' || role === 'textbox' || role === 'searchbox') {
    interaction = 'typeable';
  } else if (role === 'checkbox' || role === 'radio' || role === 'combobox' || role === 'listbox') {
    interaction = 'selectable';
  } else if (tag === 'select') {
    interaction = 'selectable';
  } else if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['submit', 'reset', 'button'].includes(type)) {
      interaction = 'clickable';
    } else if (type === 'checkbox' || type === 'radio') {
      interaction = 'selectable';
    } else {
      interaction = 'typeable';
    }
  }

  if (disabled) {
    role += ' (disabled)';
  }

  return { role, interaction };
}

function getNearestIdParent(el) {
  const chain = [];
  let current = el;

  while (current && current !== document.documentElement) {
    chain.unshift(current);
    if (current.id) break;
    current = current.parentElement;
  }

  if (!chain.length || !chain[0].id) return null;

  const parts = chain.map((node) => {
    const tag = node.tagName.toLowerCase();
    let sel = tag;
    if (node.classList.length > 0) {
      const classes = [...node.classList]
        .filter((c) => !c.startsWith('__el-picker'))
        .slice(0, 2);
      if (classes.length > 0) sel += '.' + classes.join('.');
    }
    return sel;
  });

  parts[0] = `#${CSS.escape(chain[0].id)}`;
  return parts.join(' > ');
}

function getSelectorMatchCount(selector) {
  try {
    const count = document.querySelectorAll(selector).length;
    return { count, unique: count === 1 };
  } catch {
    return { count: 0, unique: false };
  }
}

function getElementInfo(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = [...el.classList].filter((c) => !c.startsWith('__el-picker'));
  const cls = classes.length > 0 ? `.${classes.join('.')}` : '';
  const rect = el.getBoundingClientRect();
  const selector = generateSelector(el);
  return {
    tag,
    id: el.id || null,
    classes,
    text: (el.textContent || '').trim().slice(0, 80),
    dims: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
    attrs: getRelevantAttrs(el),
    selector,
    xpath: generateXPath(el),
    html: el.outerHTML,
    role: getElementRole(el),
    nearestIdParent: getNearestIdParent(el),
    matchInfo: getSelectorMatchCount(selector),
    pageUrl: window.location.href,
    timestamp: new Date().toISOString(),
  }
}

function getRelevantAttrs(el) {
  const relevant = ['type', 'name', 'placeholder', 'aria-label', 'role', 'href', 'src', 'alt', 'title', 'data-testid'];
  const attrs = {};
  for (const attr of relevant) {
    const val = el.getAttribute(attr);
    if (val) attrs[attr] = val;
  }
  return attrs;
}

function formatForClipboard(info, format) {
  switch (format) {
    case 'selector':
      return info.selector
    case 'xpath':
      return info.xpath
    case 'component': {
      const lines = [`<${info.tag}>`]
      lines.push(`CSS Selector: ${info.selector}`)
      if (info.text) lines.push(`Text: "${info.text}"`)
      if (info.dims) lines.push(`Size: ${info.dims}`)
      const attrStr = Object.entries(info.attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      if (attrStr) lines.push(attrStr)
      return lines.join('\n')
    }
    case 'html':
      return '```html\n' + info.html + '\n```'
    default: {
      const lines = ['--- Element Info ---', '## Element Info']
      const tagStr = `<${info.tag}${info.id ? ` id="${info.id}"` : ''}${info.classes.length > 0 ? ` class="${info.classes.join(' ')}"` : ''}>`
      lines.push(`- **Tag:** \`${tagStr}\``)
      lines.push(`- **CSS Selector:** \`${info.selector}\``)
      if (info.xpath) lines.push(`- **XPath:** \`${info.xpath}\``)
      if (info.text) lines.push(`- **Text:** "${info.text}"`)
      if (info.dims) lines.push(`- **Size:** ${info.dims}`)
      if (info.pageUrl) lines.push(`- **Page URL:** ${info.pageUrl}`)
      if (info.matchInfo) {
        lines.push(`- **Selector Matches:** ${info.matchInfo.count} (${info.matchInfo.unique ? 'unique' : 'not unique'})`)
      }
      if (info.nearestIdParent) {
        lines.push(`- **Nearest Unique Parent:** \`${info.nearestIdParent}\``)
      }
      if (info.role) {
        const roleLine = info.role.interaction
          ? `- **Role:** ${info.role.role} — ${info.role.interaction}`
          : `- **Role:** ${info.role.role}`
        lines.push(roleLine)
      }
      const attrStr = Object.entries(info.attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      if (attrStr) lines.push(`- **Attributes:** \`${attrStr}\``)
      if (info.screenshot) {
        lines.push('')
        lines.push(`![Element Screenshot](${info.screenshot})`)
      }
      lines.push('--- End Element Info ---')
      return lines.join('\n')
    }
  }
}

function onMouseMove(e) {
  if (!active) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === currentEl) return;
  if (el.id === '__el-picker-overlay' || el.id === '__el-picker-tooltip') return;

  currentEl = el;
  const rect = el.getBoundingClientRect();
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = 'block';

  const info = getElementInfo(el);
  let label = `<${info.tag}>`;
  if (info.id) label += ` #${info.id}`;
  if (info.classes.length > 0) label += ` .${info.classes.slice(0, 2).join('.')}`;
  if (info.text) {
    const t = info.text.length > 40 ? info.text.slice(0, 40) + '…' : info.text;
    label += `  "${t}"`;
  }

  tooltip.textContent = label;
  const tx = Math.min(e.clientX + 16, window.innerWidth - 490);
  const ty = e.clientY - 36;
  tooltip.style.left = `${tx}px`;
  tooltip.style.top = `${Math.max(4, ty)}px`;
  tooltip.style.display = 'block';
}

async function onClick(e) {
  if (!active) return;
  e.preventDefault();
  e.stopPropagation();

  const el = currentEl || document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return;

  const info = getElementInfo(el);
  let screenshot = null

  if (currentFormat === 'full' && captureScreenshot) {
    const rect = el.getBoundingClientRect()
    const size = screenshotSize || 'medium'
    const presets = {
      full:   { quality: 0.8, scale: 1 },
      medium: { quality: 0.7, scale: 0.5 },
      small:  { quality: 0.5, scale: 0.25 },
      micro:  { quality: 0.3, scale: 0.15 },
    }
    const options = presets[size] || presets.medium
    try {
      screenshot = await chrome.runtime.sendMessage({
        action: 'capture-element',
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        options,
      })
    } catch (_) {}
    if (screenshot) info.screenshot = screenshot
  }

  const text = formatForClipboard(info, currentFormat);
  await copyText(text)

  flashCopied(el);
  deactivate();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function flashCopied(el) {
  const orig = el.style.outline;
  el.style.outline = '3px solid #00bcd4';
  setTimeout(() => (el.style.outline = orig), 600);
  const toast = document.createElement('div');
  toast.textContent = '✓ Copiado!';
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #00bcd4; color: #010e24; font: 600 14px/1 sans-serif;
    padding: 10px 24px; border-radius: 8px; z-index: 2147483649;
    box-shadow: 0 4px 20px rgba(0,188,212,0.4);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}

function onKeyDown(e) {
  if (!active) return;
  if (e.key === 'Escape') {
    deactivate();
  }
}

function activate() {
  if (active) return;
  active = true;
  if (!overlay) createOverlay();
  if (!tooltip) createTooltip();
  if (!badge) createBadge();
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown);
  document.body.style.cursor = 'crosshair';
  overlay.style.display = 'block';
  badge.style.display = 'flex';
  chrome.runtime.sendMessage({ action: 'badge-on' }).catch(() => {})
}

function deactivate() {
  if (!active) return;
  active = false;
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKeyDown);
  document.body.style.cursor = '';
  if (overlay) overlay.style.display = 'none';
  if (tooltip) tooltip.style.display = 'none';
  if (badge) badge.style.display = 'none';
  currentEl = null;
  chrome.runtime.sendMessage({ action: 'badge-off' }).catch(() => {})
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'toggle-picker') {
    currentFormat = msg.format || 'full'
    if (msg.screenshot !== undefined) captureScreenshot = msg.screenshot
    if (msg.screenshotSize !== undefined) screenshotSize = msg.screenshotSize
    active ? deactivate() : activate()
  }
  if (msg.action === 'activate-picker') {
    currentFormat = msg.format || 'full'
    if (msg.screenshot !== undefined) captureScreenshot = msg.screenshot
    if (msg.screenshotSize !== undefined) screenshotSize = msg.screenshotSize
    activate()
  }
  if (msg.action === 'deactivate-picker') {
    deactivate()
  }
  if (msg.action === 'set-format') {
    currentFormat = msg.format || 'full'
  }
  if (msg.action === 'set-prefs') {
    if (msg.format) currentFormat = msg.format
    if (msg.screenshot !== undefined) captureScreenshot = msg.screenshot
    if (msg.screenshotSize !== undefined) screenshotSize = msg.screenshotSize
  }
  if (msg.action === 'copy-fallback' && msg.text) {
    const ta = document.createElement('textarea')
    ta.value = msg.text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
})

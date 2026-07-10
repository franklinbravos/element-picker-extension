let active = false;
let overlay = null;
let tooltip = null;
let currentEl = null;

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
      const siblings = [...parent.children].filter(
        (s) => s.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        selector += `:nth-child(${idx})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

function getElementInfo(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = [...el.classList].filter((c) => !c.startsWith('__el-picker'));
  const cls = classes.length > 0 ? `.${classes.join('.')}` : '';
  const rect = el.getBoundingClientRect();
  return {
    tag,
    id: el.id || null,
    classes,
    text: (el.textContent || '').trim().slice(0, 80),
    dims: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
    attrs: getRelevantAttrs(el),
    selector: generateSelector(el),
  };
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

function formatForClipboard(info) {
  const lines = [];
  lines.push(`<${info.tag}${info.id ? ` id="${info.id}"` : ''}${info.classes.length > 0 ? ` class="${info.classes.join(' ')}"` : ''}>`);
  lines.push(`  CSS Selector: ${info.selector}`);
  if (info.text) lines.push(`  Text: "${info.text}"`);
  if (info.dims) lines.push(`  Size: ${info.dims}`);
  for (const [k, v] of Object.entries(info.attrs)) {
    lines.push(`  [${k}="${v}"]`);
  }
  return lines.join('\n');
}

function onMouseMove(e) {
  if (!active) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === currentEl) return;
  if (el.id === '__el-picker-overlay' || el.id === '__el-picker-tooltip') return;

  currentEl = el;
  const rect = el.getBoundingClientRect();
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
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

function onClick(e) {
  if (!active) return;
  e.preventDefault();
  e.stopPropagation();

  const el = currentEl || document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return;

  const info = getElementInfo(el);
  const text = formatForClipboard(info);

  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  });

  flashCopied(el);
  deactivate();
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
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown);
  document.body.style.cursor = 'crosshair';
  overlay.style.display = 'block';
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
  currentEl = null;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'toggle-picker') {
    active ? deactivate() : activate();
  }
  if (msg.action === 'copy-fallback' && msg.text) {
    const ta = document.createElement('textarea');
    ta.value = msg.text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
});

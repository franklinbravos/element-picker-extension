import './picker-styles.css'

interface ElementRole {
  role: string
  interaction: string | null
}

interface SelectorMatch {
  count: number
  unique: boolean
}

interface ElementInfo {
  tag: string
  id: string | null
  classes: string[]
  text: string
  dims: string
  attrs: Record<string, string>
  selector: string
  xpath: string
  html: string
  role: ElementRole
  nearestIdParent: string | null
  matchInfo: SelectorMatch
  pageUrl: string
  timestamp: string
  isIframe: boolean
  topPageUrl: string | null
  domPath: string
  position: string
  reactComponent: string | null
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  main() {
    let active = false
    let overlay: HTMLElement | null = null
    let tooltip: HTMLElement | null = null
    let badge: HTMLElement | null = null
    let currentEl: Element | null = null
    let currentFormat = 'full'
    let captureScreenshot = true
    let screenshotSize = 'medium'
    let iframeTopUrl: string | null = null

    if (window !== window.top) {
      chrome.runtime.sendMessage({ action: 'get-tab-url' }).then((resp: any) => {
        if (resp?.url) iframeTopUrl = resp.url
      }).catch(() => {})
    }

    function createOverlay() {
      overlay = document.createElement('div')
      overlay.id = '__el-picker-overlay'
      overlay.style.cssText = [
        'position: fixed; pointer-events: none; z-index: 2147483647;',
        'border: 2px solid #50e1f9; background: rgba(80,225,249,0.12);',
        'transition: all 0.08s ease; display: none; border-radius: 4px;',
      ].join(' ')
      document.body.appendChild(overlay)
    }

    function createBadge() {
      badge = document.createElement('div')
      badge.id = '__el-picker-badge'
      badge.style.cssText = [
        'position: fixed; bottom: 16px; right: 16px; z-index: 2147483649;',
        'display: flex; align-items: center; gap: 6px;',
        'background: #010e24; color: #dbe6ff;',
        'font: 600 11px/1 system-ui, sans-serif;',
        'padding: 6px 12px 6px 8px; border-radius: 20px;',
        'border: 1px solid #3b4861;',
        'box-shadow: 0 4px 16px rgba(0,0,0,0.5);',
        'pointer-events: none;',
      ].join(' ')
      const dot = document.createElement('span')
      dot.style.cssText = 'width: 8px; height: 8px; border-radius: 50%; background: #00e676; flex-shrink: 0;'
      const label = document.createElement('span')
      label.textContent = 'Picker ativo'
      badge.appendChild(dot)
      badge.appendChild(label)
      document.body.appendChild(badge)
    }

    function createTooltip() {
      tooltip = document.createElement('div')
      tooltip.id = '__el-picker-tooltip'
      tooltip.style.cssText = [
        'position: fixed; pointer-events: none; z-index: 2147483648;',
        'background: #010e24; color: #dbe6ff; font: 12px/1.4 monospace;',
        'padding: 8px 12px; border-radius: 6px; border: 1px solid #3b4861;',
        'box-shadow: 0 4px 16px rgba(0,0,0,0.5); display: none;',
        'max-width: 480px; white-space: nowrap;',
      ].join(' ')
      document.body.appendChild(tooltip)
    }

    function generateSelector(el: Element): string {
      if (el.id) return `#${CSS.escape(el.id)}`
      const path: string[] = []
      let current: Element | null = el
      while (current && current !== document.body && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase()
        let selector = tag
        if (current.id) {
          path.unshift(`#${CSS.escape(current.id)}`)
          break
        }
        if (current.classList.length > 0) {
          const classes = [...current.classList]
            .filter((c) => !c.startsWith('__el-picker'))
            .slice(0, 3)
            .map((c) => `.${CSS.escape(c)}`)
          if (classes.length > 0) selector += classes.join('')
        }
        const parent = current.parentElement
        if (parent) {
          const children = [...parent.children]
          if (children.length > 1) {
            const idx = children.indexOf(current) + 1
            selector += `:nth-child(${idx})`
          }
        }
        path.unshift(selector)
        current = current.parentElement
      }
      return path.join(' > ')
    }

    function generateXPath(el: Element): string {
      if (el.id) return `//*[@id="${el.id}"]`
      const parts: string[] = []
      let current: Element | null = el
      while (current && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase()
        let part = tag
        if (current.id) {
          parts.unshift(`//*[@id="${current.id}"]`)
          break
        }
        const parent = current.parentElement
        if (parent) {
          const siblings = [...parent.children].filter((s) => s.tagName === current!.tagName)
          if (siblings.length > 1) {
            const idx = siblings.indexOf(current) + 1
            part += `[${idx}]`
          }
        }
        parts.unshift(part)
        current = current.parentElement
      }
      return '/' + parts.join('/')
    }

    function getElementRole(el: Element): ElementRole {
      const tag = el.tagName.toLowerCase()
      const roleAttr = el.getAttribute('role')
      const disabled = el.getAttribute('aria-disabled') === 'true' || (el as HTMLInputElement).disabled
      let role = 'generic'
      let interaction: string | null = null
      if (tag === 'a') role = 'link'
      else if (tag === 'button') role = 'button'
      else if (tag === 'input') {
        const type = (el.getAttribute('type') || 'text').toLowerCase()
        if (['submit', 'reset', 'button'].includes(type)) role = 'button'
        else if (type === 'checkbox') role = 'checkbox'
        else if (type === 'radio') role = 'radio'
        else if (type === 'range') role = 'slider'
        else if (type === 'number') role = 'spinbutton'
        else if (type === 'search') role = 'searchbox'
        else role = 'textbox'
      } else if (tag === 'textarea') role = 'textbox'
      else if (tag === 'img') role = 'img'
      else if (tag === 'select') role = 'combobox'
      else if (/^h[1-6]$/.test(tag)) role = 'heading'
      if (roleAttr) role = roleAttr
      if (tag === 'a' || tag === 'button' || role === 'link' || role === 'button') interaction = 'clickable'
      else if (tag === 'textarea' || role === 'textbox' || role === 'searchbox') interaction = 'typeable'
      else if (['checkbox', 'radio', 'combobox', 'listbox'].includes(role)) interaction = 'selectable'
      else if (tag === 'select') interaction = 'selectable'
      else if (tag === 'input') {
        const type = (el.getAttribute('type') || 'text').toLowerCase()
        if (['submit', 'reset', 'button'].includes(type)) interaction = 'clickable'
        else if (type === 'checkbox' || type === 'radio') interaction = 'selectable'
        else interaction = 'typeable'
      }
      if (disabled) role += ' (disabled)'
      return { role, interaction }
    }

    function getNearestIdParent(el: Element): string | null {
      const chain: Element[] = []
      let current: Element | null = el
      while (current && current !== document.documentElement) {
        chain.unshift(current)
        if (current.id) break
        current = current.parentElement
      }
      if (!chain.length || !chain[0].id) return null
      const parts = chain.map((node) => {
        const tag = node.tagName.toLowerCase()
        let sel = tag
        if (node.classList.length > 0) {
          const classes = [...node.classList].filter((c) => !c.startsWith('__el-picker')).slice(0, 2)
          if (classes.length > 0) sel += '.' + classes.join('.')
        }
        return sel
      })
      parts[0] = `#${CSS.escape(chain[0].id)}`
      return parts.join(' > ')
    }

    function getSelectorMatchCount(selector: string): SelectorMatch {
      try {
        const count = document.querySelectorAll(selector).length
        return { count, unique: count === 1 }
      } catch {
        return { count: 0, unique: false }
      }
    }

    function getRelevantAttrs(el: Element): Record<string, string> {
      const relevant = ['type', 'name', 'placeholder', 'aria-label', 'role', 'href', 'src', 'alt', 'title', 'data-testid']
      const attrs: Record<string, string> = {}
      for (const attr of relevant) {
        const val = el.getAttribute(attr)
        if (val) attrs[attr] = val
      }
      return attrs
    }

    function generateDomPath(el: Element): string {
      const parts: string[] = []
      let current: Element | null = el
      while (current && current !== document.body && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase()
        const cls = [...current.classList].filter((c) => !c.startsWith('__el-picker'))
        const id = current.id
        let part = tag
        if (cls.length > 0) part += '.' + cls.join('.')
        if (id) part += '#' + id
        parts.unshift(part)
        current = current.parentElement
      }
      return parts.join(' > ')
    }

    function detectReactComponent(el: Element): string | null {
      try {
        const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'))
        if (!key) return null
        let fiber = (el as any)[key]
        while (fiber) {
          const name = fiber.type?.name || fiber.type?.displayName
          if (name && !['div', 'span', 'input', 'button', 'a', 'li', 'ul', 'p', 'h1', 'h2', 'h3', 'h4', 'form', 'section', 'main', 'header', 'footer', 'nav', 'article', 'aside', 'label', 'select', 'textarea', 'img'].includes(name.toLowerCase())) {
            return name
          }
          fiber = fiber.return
        }
      } catch {
        // React not available or access denied
      }
      return null
    }

    function getElementInfo(el: Element): ElementInfo {
      const tag = el.tagName.toLowerCase()
      const classes = [...el.classList].filter((c) => !c.startsWith('__el-picker'))
      const rect = el.getBoundingClientRect()
      const selector = generateSelector(el)
      const isIframe = window !== window.top
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
        isIframe,
        topPageUrl: isIframe ? iframeTopUrl : null,
        domPath: generateDomPath(el),
        position: `top=${Math.round(rect.top)}px, left=${Math.round(rect.left)}px, width=${Math.round(rect.width)}px, height=${Math.round(rect.height)}px`,
        reactComponent: detectReactComponent(el),
      }
    }

    function formatForClipboard(info: ElementInfo, format: string): string {
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
          const attrStr = Object.entries(info.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')
          if (attrStr) lines.push(attrStr)
          return lines.join('\n')
        }
        case 'html':
          return '```html\n' + info.html + '\n```'
        default: {
          const lines = ['--- Element Info ---', '## Element Info']
          const tagStr = `<${info.tag}${info.id ? ` id="${info.id}"` : ''}${info.classes.length > 0 ? ` class="${info.classes.join(' ')}"` : ''}>`
          lines.push(`- **Tag:** \`${tagStr}\``)
          lines.push(`- **DOM Path:** \`${info.domPath}\``)
          lines.push(`- **Position:** ${info.position}`)
          lines.push(`- **CSS Selector:** \`${info.selector}\``)
          if (info.xpath) lines.push(`- **XPath:** \`${info.xpath}\``)
          if (info.text) lines.push(`- **Text:** "${info.text}"`)
          if (info.reactComponent) lines.push(`- **React Component:** \`${info.reactComponent}\``)
          if (info.dims) lines.push(`- **Size:** ${info.dims}`)
          if (info.pageUrl) lines.push(`- **Page URL:** ${info.pageUrl}`)
          if (info.isIframe) {
            lines.push(`- **Frame:** \`${info.pageUrl}\``)
            if (info.topPageUrl) lines.push(`- **Top Page:** ${info.topPageUrl}`)
          }
          if (info.matchInfo) lines.push(`- **Selector Matches:** ${info.matchInfo.count} (${info.matchInfo.unique ? 'unique' : 'not unique'})`)
          if (info.nearestIdParent) lines.push(`- **Nearest Unique Parent:** \`${info.nearestIdParent}\``)
          if (info.role) {
            const roleLine = info.role.interaction
              ? `- **Role:** ${info.role.role} — ${info.role.interaction}`
              : `- **Role:** ${info.role.role}`
            lines.push(roleLine)
          }
          const attrStr = Object.entries(info.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')
          if (attrStr) lines.push(`- **Attributes:** \`${attrStr}\``)
          lines.push('', '```html', info.html, '```', '')
          lines.push('--- End Element Info ---')
          return lines.join('\n')
        }
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (!active) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || el === currentEl) return
      if (el.id === '__el-picker-overlay' || el.id === '__el-picker-tooltip') return
      currentEl = el
      const rect = el.getBoundingClientRect()
      overlay!.style.top = `${rect.top}px`
      overlay!.style.left = `${rect.left}px`
      overlay!.style.width = `${rect.width}px`
      overlay!.style.height = `${rect.height}px`
      overlay!.style.display = 'block'
      const info = getElementInfo(el)
      let label = `<${info.tag}>`
      if (info.id) label += ` #${info.id}`
      if (info.classes.length > 0) label += ` .${info.classes.slice(0, 2).join('.')}`
      if (info.text) {
        const t = info.text.length > 40 ? info.text.slice(0, 40) + '\u2026' : info.text
        label += `  "${t}"`
      }
      tooltip!.textContent = label
      const tx = Math.min(e.clientX + 16, window.innerWidth - 490)
      const ty = e.clientY - 36
      tooltip!.style.left = `${tx}px`
      tooltip!.style.top = `${Math.max(4, ty)}px`
      tooltip!.style.display = 'block'
    }

    async function copyToClipboard(text: string) {
      try {
        await navigator.clipboard.writeText(text)
        return
      } catch {
        // fall back to legacy execCommand
      }
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }

    async function onClick(e: MouseEvent) {
      if (!active) return
      e.preventDefault()
      e.stopPropagation()
      const el = currentEl || document.elementFromPoint(e.clientX, e.clientY)
      if (!el) return
      const info = getElementInfo(el)
      const text = formatForClipboard(info, currentFormat)
      await copyToClipboard(text)

      if (captureScreenshot && currentFormat === 'full') {
        const rect = el.getBoundingClientRect()
        let offsetX = 0, offsetY = 0
        if (window.frameElement) {
          const fRect = window.frameElement.getBoundingClientRect()
          offsetX = fRect.x
          offsetY = fRect.y
        }
        const size = screenshotSize || 'medium'
        const presets: Record<string, { quality: number; scale: number }> = {
          full:   { quality: 0.8, scale: 1 },
          medium: { quality: 0.7, scale: 0.5 },
          small:  { quality: 0.5, scale: 0.25 },
          micro:  { quality: 0.3, scale: 0.15 },
        }
        try {
          const resp = await Promise.race([
            chrome.runtime.sendMessage({
              action: 'copy-with-screenshot',
              text,
              rect: { x: rect.x + offsetX, y: rect.y + offsetY, width: rect.width, height: rect.height },
              options: presets[size] || presets.medium,
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
          ]) as any
          if (resp?.text && !resp.error) {
            await copyToClipboard(resp.text)
          }
        } catch { /* screenshot failed, text already copied */ }
      }

      flashCopied(el)
      deactivate()
    }

    function flashCopied(el: Element) {
      const orig = (el as HTMLElement).style.outline
      ;(el as HTMLElement).style.outline = '3px solid #00bcd4'
      setTimeout(() => ((el as HTMLElement).style.outline = orig), 600)
      const toast = document.createElement('div')
      toast.textContent = '\u2713 Copiado!'
      toast.style.cssText = [
        'position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);',
        'background: #00bcd4; color: #010e24; font: 600 14px/1 sans-serif;',
        'padding: 10px 24px; border-radius: 8px; z-index: 2147483649;',
        'box-shadow: 0 4px 20px rgba(0,188,212,0.4);',
      ].join(' ')
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 1500)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!active) return
      if (e.key === 'Escape') deactivate()
    }

    function activate() {
      if (active) return
      console.log('[Picker] activate()')
      active = true
      if (!overlay) createOverlay()
      if (!tooltip) createTooltip()
      if (!badge) createBadge()
      document.addEventListener('mousemove', onMouseMove, true)
      document.addEventListener('click', onClick, true)
      document.addEventListener('keydown', onKeyDown)
      document.body.style.cursor = 'crosshair'
      overlay!.style.display = 'block'
      badge!.style.display = 'flex'
      chrome.runtime.sendMessage({ action: 'badge-on' }).catch(() => {})
    }

    function deactivate() {
      if (!active) return
      console.log('[Picker] deactivate()')
      active = false
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.cursor = ''
      if (overlay) overlay.style.display = 'none'
      if (tooltip) tooltip.style.display = 'none'
      if (badge) badge.style.display = 'none'
      currentEl = null
      chrome.runtime.sendMessage({ action: 'badge-off' }).catch(() => {})
    }

    chrome.runtime.onMessage.addListener((msg: any) => {
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
    })
  },
})

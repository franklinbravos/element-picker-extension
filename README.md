# Element Picker for AI Agents

![Version](https://img.shields.io/badge/version-1.2.0-blue)

Browser extension that lets users click any element on a page and instantly copies its CSS selector + rich metadata to clipboard, formatted as a markdown prompt ready for AI coding assistants (OpenCode, Cursor, Claude Code).

## Features

- **Visual element picker** -- hover highlights elements with a blue overlay and floating tooltip
- **Rich clipboard output** in markdown format including: tag, CSS selector, XPath, text content, size, page URL, selector uniqueness, nearest ID parent, ARIA role with interaction hint, all relevant attributes
- **Keyboard shortcut:** `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac) to toggle picker on/off
- **Esc** to cancel picker
- **Visual feedback:** flash outline and toast "Copied!" on selection
- **Works on any webpage** via content script injection
- **Clipboard fallback** for restricted environments
- **Output format selector** in popup (full, selector only, component+selector, XPath)

## Installation

Since the extension is not published on the Chrome Web Store:

1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **"Load unpacked"**
5. Select the extension folder
6. The extension appears in the toolbar with the blue crosshair icon

## Usage

1. Click the extension icon in the toolbar or press `Ctrl+Shift+L`
2. Hover over any element -- it highlights with a blue border and shows a tooltip with basic info
3. Click the element -- info is copied to clipboard
4. Press `Esc` or click the icon again to cancel
5. Paste into OpenCode/Cursor/Claude (the data is already formatted as a markdown prompt)

## Keyboard shortcut

- Toggle picker: `Ctrl+Shift+L` (Windows/Linux) / `Cmd+Shift+L` (Mac)
- Cancel: `Esc`
- Customize at `chrome://extensions/shortcuts`

## Output format

When you click an element, the following markdown is copied to your clipboard:

```
## Element Info
- **Tag:** `<a class="site-header__brand">`
- **CSS Selector:** `header.site-header > div.site-header__inner > a.site-header__brand`
- **XPath:** `/html/body/header[1]/div[1]/a[1]`
- **Text:** "Bravos Consult"
- **Size:** 430x32
- **Page URL:** https://franklinbravos.com
- **Selector Matches:** 1 (unique)
- **Nearest Unique Parent:** `#header > div.site-header__inner`
- **Role:** link -- clickable
- **Attributes:** `href="https://franklinbravos.com"`
```

Field descriptions:

- **Tag** -- reconstructed opening tag with id and classes
- **CSS Selector** -- ready-to-use CSS selector string
- **XPath** -- XPath 1.0 expression (standard, position-based)
- **Text** -- trimmed text content (first 80 characters)
- **Size** -- element dimensions in pixels (width x height)
- **Page URL** -- URL of the page where the element lives
- **Selector Matches** -- how many elements on the page match this CSS selector (1 = unique)
- **Nearest Unique Parent** -- CSS path from the nearest ancestor with an id down to the element
- **Role** -- computed ARIA role and an interaction hint (clickable, typeable, selectable, or blank)
- **Attributes** -- relevant attributes (href, src, alt, placeholder, aria-label, data-testid, etc.)

## File structure

```
├── manifest.json        # Extension manifest (v3)
├── content.js           # Content script: picker logic, selector generation, clipboard
├── content.css          # Minimal injection styles
├── background.js        # Service worker: message relay and keyboard commands
├── popup.html           # Popup UI
├── popup.js             # Popup logic (toggle, format selector, settings)
└── icons/
    ├── icon16.png       # Toolbar icon (16x16)
    ├── icon48.png       # Extension management icon (48x48)
    └── icon128.png      # Store icon (128x128)
```

## Tech stack

- Manifest V3
- Vanilla JavaScript (zero dependencies)
- Native CSS
- Chrome Extensions API (scripting, activeTab, clipboardWrite, storage)

## Development

- No build step -- edit files and reload in `chrome://extensions/`
- Reload the extension using the reload button after making changes
- To regenerate icons: `node build-icons.mjs` (requires sharp)

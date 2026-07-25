# Element Picker for AI Agents

![Version](https://img.shields.io/badge/version-1.6.1-blue)

Browser extension that lets users click any element on a page and instantly copies its CSS selector + rich metadata to clipboard, formatted as a markdown prompt ready for AI coding assistants (OpenCode, Cursor, Claude Code).

## Features

- **Visual element picker** — hover highlights elements with a blue overlay and floating tooltip
- **Rich clipboard output** in markdown format including: tag, CSS selector, XPath, DOM path, text content, size, position, page URL, selector uniqueness, nearest ID parent, ARIA role with interaction hint, all relevant attributes, outerHTML, React component name
- **Element screenshot** — optionally captures a cropped JPEG screenshot of the selected element and embeds it as a base64 image in the clipboard output
- **Adjustable screenshot quality/size** — full, medium (50%), small (25%), micro (15%)
- **Keyboard shortcut:** `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac) to toggle picker on/off
- **Esc** to cancel picker
- **Visual feedback:** flash outline and toast "Copied!" on selection
- **Output format selector** in popup (full markdown, selector only, component+selector, XPath, HTML outerHTML)
- **iframe support** — detects if the element lives inside an iframe and includes the frame URL
- **React component detection** — traverses the React fiber tree to find the component name
- **Toggle on/off** from the popup UI — click the status bar to toggle

## Installation

Since the extension is not published on the Chrome Web Store:

1. Download or clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Open `chrome://extensions/`
5. Enable **Developer mode** (toggle in the top right corner)
6. Click **"Load unpacked"**
7. Select the `.output/` directory (WXT build output)
8. The extension appears in the toolbar with the blue crosshair icon

## Usage

1. Click the extension icon in the toolbar or press `Ctrl+Shift+L`
2. Hover over any element — it highlights with a blue border and shows a tooltip with basic info
3. Click the element — text info is copied to clipboard immediately; a screenshot is captured asynchronously and updates the clipboard if successful
4. Press `Esc` or toggle the picker off in the popup to cancel
5. Paste into OpenCode/Cursor/Claude (the data is already formatted as a markdown prompt)

### Popup controls

- **Status bar** — click to toggle the picker on/off (shows green dot when active)
- **Output format** — choose between Full (markdown), CSS Selector only, Component + Selector, XPath, or HTML (outerHTML)
- **Screenshot checkbox** — enable/disable element screenshot capture
- **Screenshot size** — select resolution preset (Original JPEG, Medium 50%, Small 25%, Micro 15%)

## Keyboard shortcut

- Toggle picker: `Ctrl+Shift+L` (Windows/Linux) / `Cmd+Shift+L` (Mac)
- Cancel: `Esc`
- Customize at `chrome://extensions/shortcuts`

## Output format

When you click an element with the **Full** format selected, the following markdown is copied to your clipboard:

```
--- Element Info ---
## Element Info
- **Tag:** `<a class="site-header__brand">`
- **DOM Path:** `header > div.site-header__inner > a.site-header__brand`
- **Position:** top=0px, left=0px, width=430px, height=32px
- **CSS Selector:** `header.site-header > div.site-header__inner > a.site-header__brand`
- **XPath:** `/html/body/header[1]/div[1]/a[1]`
- **Text:** "Bravos Consult"
- **React Component:** `Header`
- **Size:** 430x32
- **Page URL:** https://franklinbravos.com
- **Selector Matches:** 1 (unique)
- **Nearest Unique Parent:** `#header > div.site-header__inner`
- **Role:** link — clickable
- **Attributes:** `href="https://franklinbravos.com"`

```html
<a class="site-header__brand" href="https://franklinbravos.com">Bravos Consult</a>
```

--- End Element Info ---
```

If screenshot capture is enabled, a `![Element Screenshot](data:image/jpeg;base64,...)` line is appended before the footer.

### Other formats

| Format | Output |
|---|---|
| **selector** | Just the CSS selector string |
| **xpath** | Just the XPath expression |
| **component** | Tag, CSS selector, text, size, and relevant attributes |
| **html** | The element's outerHTML wrapped in a markdown code block |

## File structure

```
├── wxt.config.ts            # WXT configuration (manifest, paths, build)
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies and scripts
├── src/
│   └── entrypoints/
│       ├── background.ts     # Service worker (screenshot crop, badge, commands)
│       ├── content.content.ts# Content script (picker logic, selectors, clipboard)
│       ├── picker-styles.css # Minimal injection styles
│       └── popup/
│           ├── index.html    # Popup UI
│           └── main.ts       # Popup logic (toggle, format, screenshot prefs)
├── public/
│   └── icons/
│       ├── icon16.png        # Toolbar icon (16x16)
│       ├── icon48.png        # Extension management icon (48x48)
│       └── icon128.png       # Store icon (128x128)
├── sw.js                     # Standalone service worker (legacy)
├── background.js             # Legacy background script
├── content.js                # Legacy content script
├── popup.html                # Legacy popup
├── popup.js                  # Legacy popup logic
└── manifest.json             # Legacy manifest (v3)
```

## Tech stack

- **Build tool:** WXT v0.19
- **Language:** TypeScript
- **Target:** Chrome Manifest V3
- **Runtime:** Chrome Extensions API (scripting, activeTab, clipboardWrite, storage, tabs)
- **Screenshot processing:** OffscreenCanvas + createImageBitmap + FileReader (inside service worker)
- **Zero runtime dependencies** — only WXT + TypeScript as dev dependencies

## Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Package as .zip for Chrome Web Store
npm run zip
```

The extension loads from the `.output/` directory after building. During `npm run dev`, WXT automatically rebuilds on file changes and the extension can be reloaded at `chrome://extensions/`.

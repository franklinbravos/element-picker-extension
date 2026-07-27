# Element Picker for AI Agents

![Version](https://img.shields.io/badge/version-1.6.3-blue)

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

## Requirements

- **Node.js** 18+
- **npm** 9+

## Quick start

```bash
git clone <repo-url>
cd element-picker-extension
git checkout main          # default branch
nvm install --lts          # (skip if Node.js 18+ installed)
npm install
npm run build              # ← required! produces dist/
```

Then load `dist/chrome-mv3/` as an unpacked extension in Chrome.

## Installation

Since the extension is not published on the Chrome Web Store:

1. Clone the repo and run `npm install && npm run build` (see [Development](#development))
2. Open `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **"Load unpacked"**
5. Select the `dist/chrome-mv3/` directory — this is the build output from WXT
6. The extension appears in the toolbar with the blue crosshair icon

> **Important:** the project uses WXT to compile TypeScript source files into a production bundle. You *must* build before loading — the legacy `.js`/`.html` files at the project root are stale and are not used by the current build.

## Usage

1. Click the extension icon in the toolbar or press `Ctrl+Shift+L`
2. Hover over any element — it highlights with a blue border and shows a tooltip with basic info
3. Click the element — text info is copied to clipboard immediately; a screenshot is captured asynchronously and updates the clipboard if successful
4. Press `Esc` or toggle the picker off in the popup to cancel
5. Paste into OpenCode/Cursor/Claude (the data is already formatted as a markdown prompt)

### Popup controls

- **Status bar** — click to toggle the picker on/off (shows green dot when active, dims when inactive)
- **Output format** — choose between Full (markdown), CSS Selector only, Component + Selector, XPath, or HTML (outerHTML)
- **Screenshot checkbox** — enable/disable element screenshot capture
- **Screenshot size** — select resolution preset (Original JPEG, Medium 50%, Small 25%, Micro 15%)
- Preferences are persisted in `chrome.storage.local`

## Keyboard shortcut

| Action | Windows/Linux | Mac |
|---|---|---|
| Toggle picker | `Ctrl+Shift+L` | `Cmd+Shift+L` |
| Cancel | `Esc` | `Esc` |

Customize at `chrome://extensions/shortcuts`.

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

## Architecture

The extension follows WXT's entrypoint-based structure:

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   popup/     │────▶│  content script   │◀────│  background.ts  │
│  main.ts     │     │ content.content.ts│     │ (service worker)│
│  index.html  │     │ + picker-styles   │     │                 │
└──────────────┘     └────────┬─────────┘     └─────────────────┘
                              │
                              ▼
                     User clicks element
                     → formatForClipboard()
                     → document.execCommand('copy')
                     → if screenshot enabled:
                       sendMessage → background.ts
                       → captureVisibleTab
                       → OffscreenCanvas crop
                       → JPEG compression
                       → navigator.clipboard.writeText()
```

- **background.ts** — service worker: handles keyboard commands, screenshot cropping (OffscreenCanvas), badge management, and iframe URL resolution
- **content.content.ts** — injected into every page: overlay/tooltip/badge DOM, mouse tracking, selector/XPath generation, clipboard write, React fiber tree inspection
- **popup/** — toggle picker, format/screenshot prefs persisted in `chrome.storage.local`

## File structure

Only the files under `src/` and `public/` are source code. Everything else is build configuration or stale legacy files.

```
├── src/                          # ◄── SOURCE CODE (TypeScript)
│   └── entrypoints/
│       ├── background.ts         #     Service worker
│       ├── content.content.ts    #     Content script (picker logic)
│       ├── picker-styles.css     #     Injected styles
│       └── popup/
│           ├── index.html        #     Popup UI
│           └── main.ts           #     Popup logic
├── public/
│   └── icons/                    # ◄── Static assets
├── wxt.config.ts                 # WXT + manifest configuration
├── tsconfig.json                 # TypeScript compiler options
├── package.json                  # Dependencies & scripts
├── .gitignore                    # Ignores dist/, .wxt/, node_modules/
│
├── dist/                         # (gitignored) WXT build output → dist/chrome-mv3/
├── .wxt/                         # (gitignored) WXT cache
├── node_modules/                 # (gitignored)
│
├── background.js                 # ┐
├── content.js                    # │
├── manifest.json                 # ├─ Legacy files (stale, not used)
├── popup.html                    # │
├── popup.js                      # │
└── sw.js                         # ┘
```

## Tech stack

| Layer | Technology |
|---|---|
| **Build tool** | [WXT](https://wxt.dev) v0.19 |
| **Language** | TypeScript 5 |
| **Target platform** | Chrome Manifest V3 |
| **Extension APIs** | scripting, activeTab, clipboardWrite, storage, tabs |
| **Screenshot** | OffscreenCanvas + createImageBitmap inside service worker |
| **Runtime deps** | None (zero dependencies) |
| **Dev deps** | `wxt`, `typescript` |

## Development

```bash
# Install dependencies
npm install

# Development server (auto-rebuild on changes)
npm run dev

# Production build → dist/
npm run build

# Package as .zip for Chrome Web Store submission
npm run zip
```

After building, the extension lives in `dist/chrome-mv3/`. During `npm run dev`, WXT watches `src/` and rebuilds on every change — reload the extension at `chrome://extensions/` to pick up the new build.

### Adding an entrypoint

WXT uses file-based routing in `src/entrypoints/`:

| File pattern | Entrypoint type |
|---|---|
| `background.ts` | Service worker |
| `*.content.ts` | Content script (injected into pages) |
| `popup/` | Popup (index.html + main.ts) |
| `options/` | Options page |
| `sandbox/` | Sandboxed page |

See [WXT docs](https://wxt.dev/guide/entrypoints.html) for details.

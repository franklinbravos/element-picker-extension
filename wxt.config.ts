import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  manifest: {
    name: 'Element Picker for AI Agents',
    version: '1.6.1',
    description: 'Clique em elementos da página para copiar seletores CSS — cole no OpenCode/Cursor/Claude.',
    permissions: ['activeTab', 'clipboardWrite', 'storage', 'scripting', 'tabs'],
    action: {
      default_title: 'Element Picker',
      default_popup: 'popup.html',
      default_icon: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
    },
    commands: {
      'toggle-picker': {
        suggested_key: {
          default: 'Ctrl+Shift+L',
          mac: 'Command+Shift+L',
        },
        description: 'Ativar/desativar seletor de elementos',
      },
    },
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
})

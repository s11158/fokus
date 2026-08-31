import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/fokus/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'Фокус — задачи',
        short_name: 'Фокус',
        description: 'Личный таск-менеджер по методологии GTD. Offline-first.',
        lang: 'ru',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/fokus/',
        scope: '/fokus/',
        // Deep-link: ссылки web+fokus://?page=&id=T-… открывают приложение.
        protocol_handlers: [{ protocol: 'web+fokus', url: '/fokus/?deeplink=%s' }],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Разбиваем тяжёлые зависимости в отдельные чанки.
        manualChunks: {
          react: ['react', 'react-dom'],
          tiptap: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link', '@tiptap/extension-placeholder'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          dexie: ['dexie', 'dexie-react-hooks'],
          datefns: ['date-fns'],
        },
      },
    },
  },
})

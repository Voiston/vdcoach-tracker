import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const SUPABASE = 'mapnorwosymvhzgkasxf.supabase.co'
const CSP = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://${SUPABASE} wss://${SUPABASE}; object-src 'none'; base-uri 'self'; form-action 'self'`

// Ajoute la Content-Security-Policy au build uniquement (le serveur de dev a besoin de scripts inline)
const csp: Plugin = {
  name: 'csp',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
}

// Sur GitHub Pages, le site vit dans /nom-du-depot/ : le workflow fournit BASE_PATH.
// En local (npm run dev), on reste à la racine.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    csp,
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'VDCoach Tracker',
        short_name: 'VDCoach',
        lang: 'fr',
        description: 'Suivi des séances de coaching',
        theme_color: '#2f7d6b',
        background_color: '#f2f5f3',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : les chemins des fichiers restent relatifs, ce qui permet de
// publier le site dans un sous-dossier (https://pseudo.github.io/vdcoach-tracker/)
export default defineConfig({ base: './', plugins: [react()] })

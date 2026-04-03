import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Telefon (aynı Wi‑Fi) ile PC’deki sayfayı açmak için
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})

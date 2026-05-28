import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) return 'vendor_jspdf'
            if (id.includes('html2canvas')) return 'vendor_html2canvas'
            if (id.includes('node_modules/react/')) return 'vendor_react'
            if (id.includes('node_modules/react-dom/')) return 'vendor_react_dom'
            if (id.includes('lucide-react') || id.includes('@radix-ui')) return 'vendor_ui'
            return 'vendor'
          }
        }
      }
    }
  }
})
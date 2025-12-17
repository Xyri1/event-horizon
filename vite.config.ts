import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Important for GitHub Pages: render assets with relative paths (e.g. "./assets/..." instead of "/assets/...")
  // This allows the app to work in a subdirectory (https://<user>.github.io/<repo>/)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
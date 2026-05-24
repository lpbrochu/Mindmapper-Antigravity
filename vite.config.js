import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative pathing for compiled assets so the app is fully portable
  // and works on GitHub Pages subpaths, Vercel, or even local file systems.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined // keep the bundle unified and simple
      }
    }
  }
});

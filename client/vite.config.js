import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Ensure relative paths for assets
  plugins: [react()],
  build: {
    outDir: 'dist', // Output directory for build
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://mariaortegas-project.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    historyApiFallback: true, // Handle client-side routing during development
  },
});

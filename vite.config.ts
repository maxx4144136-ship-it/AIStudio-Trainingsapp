import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'process.env': {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
    }
  },
  build: {
    outDir: 'dist',
  }
});

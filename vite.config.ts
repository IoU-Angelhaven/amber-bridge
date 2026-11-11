import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base + hash routing: the build works in any sub-folder (GitHub Pages) and on a custom domain.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Root-relative by default so `npm run build` works served from anywhere.
// A GitHub Pages project site needs the repo subpath:
//   BASE_PATH=/gotta-chug-em-all/ npm run build
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  test: {
    // Default environment is 'node' for fast, DOM-free logic tests (engine/data,
    // added in later tasks). Vitest 4 removed `environmentMatchGlobs`, so
    // DOM-dependent test files (component tests, src/App.test.tsx) opt into
    // jsdom individually via a `// @vitest-environment jsdom` docblock pragma
    // at the top of the file instead.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});

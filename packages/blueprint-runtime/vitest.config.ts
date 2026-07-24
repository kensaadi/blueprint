/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    server: {
      deps: {
        // @dashforge/forms pulls in sub-deps that ship CJS; inline the
        // scope so vitest's ESM resolver transforms them.
        inline: [/@dashforge\//],
      },
    },
  },
});

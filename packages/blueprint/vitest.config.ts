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
        // MUI + dashforge ship some CJS sub-deps; inline so vitest's ESM
        // resolver transforms them through the test pipeline.
        inline: [/@mui\//, /react-transition-group/, /@dashforge\//],
      },
    },
  },
});

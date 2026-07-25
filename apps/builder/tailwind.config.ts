import type { Config } from 'tailwindcss';
import { dashforgePreset } from '@dashforge/tw-theme';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@dashforge/tw/dist/**/*.js',
  ],
  presets: [dashforgePreset()],
} satisfies Config;

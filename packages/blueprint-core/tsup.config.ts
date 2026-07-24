import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Never bundle these — they're peers/deps of the consumer.
  external: ['@dashforge/rbac', 'zod', 'react'],
});

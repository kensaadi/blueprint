import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Never bundle these — they resolve from the consumer's own tree.
  external: ['@dashforge/blueprint-core', '@dashforge/forms', 'react', 'react/jsx-runtime'],
});

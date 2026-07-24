import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // The compiler pulls in both flavor packs (Decision #12) — externalize
  // every workspace sibling + peer so the consumer resolves one copy each.
  external: [
    '@dashforge/blueprint-core',
    '@dashforge/blueprint-runtime',
    '@dashforge/blueprint-tw',
    '@dashforge/blueprint-mui',
    '@dashforge/forms',
    'react',
    'react-dom',
    'react/jsx-runtime',
    'zod',
  ],
});

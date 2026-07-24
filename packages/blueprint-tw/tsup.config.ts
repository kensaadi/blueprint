import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Everything cross-package or peer resolves from the consumer tree —
  // never bundle a flavor pack's runtime siblings or React.
  external: [
    '@dashforge/blueprint-core',
    '@dashforge/blueprint-runtime',
    '@dashforge/tw',
    '@dashforge/forms',
    '@dashforge/rbac',
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-hook-form',
    '@hookform/resolvers',
    '@hookform/resolvers/zod',
    'zod',
  ],
});

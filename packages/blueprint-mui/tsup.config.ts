import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Cross-package + peers resolve from the consumer tree — never bundle.
  external: [
    '@dashforge/blueprint-core',
    '@dashforge/blueprint-runtime',
    '@dashforge/ui',
    '@dashforge/forms',
    '@dashforge/rbac',
    '@mui/material',
    '@emotion/react',
    '@emotion/styled',
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-hook-form',
    '@hookform/resolvers',
    '@hookform/resolvers/zod',
    'zod',
  ],
});

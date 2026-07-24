import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Monorepo lint baseline + architectural guardrail.
 *
 * The acyclic package graph locked at extraction (D-EXTRACT-3) is:
 *
 *   core → runtime → { tw, mui } → blueprint (compiler)
 *
 * pnpm's strict node-linker already makes a forbidden import unresolvable
 * at build time (a package can only import what's in its own deps). We add
 * a fast, readable lint-time error on top via `no-restricted-imports`,
 * scoped per package — this matches the import specifier directly, so it
 * catches a violation the moment it's typed, before install/build.
 *
 * (`eslint-plugin-boundaries` was evaluated but resolves cross-package
 * `@dashforge/*` imports through each package's built `dist`, which needs
 * an import resolver to classify — `no-restricted-imports` is exact and
 * dependency-free.)
 */

/** Forbid importing these sibling packages (name + any subpath). */
const forbid = (...names) => ({
  '@typescript-eslint/no-restricted-imports': [
    'error',
    {
      patterns: names.map((name) => ({
        group: [name, `${name}/*`],
        message: `Package-graph violation: this package must not import ${name} (would create a cycle — see D-EXTRACT-3).`,
      })),
    },
  ],
});

const CORE = '@dashforge/blueprint-core';
const RUNTIME = '@dashforge/blueprint-runtime';
const TW = '@dashforge/blueprint-tw';
const MUI = '@dashforge/blueprint-mui';
const COMPILER = '@dashforge/blueprint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Contract-runtime style: allow deliberate unused args prefixed `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ─── Package-graph enforcement (D-EXTRACT-3) ─────────────────────────
  { files: ['packages/blueprint-core/src/**/*.{ts,tsx}'], rules: forbid(RUNTIME, TW, MUI, COMPILER) },
  { files: ['packages/blueprint-runtime/src/**/*.{ts,tsx}'], rules: forbid(TW, MUI, COMPILER) },
  { files: ['packages/blueprint-tw/src/**/*.{ts,tsx}'], rules: forbid(MUI, COMPILER) },
  { files: ['packages/blueprint-mui/src/**/*.{ts,tsx}'], rules: forbid(TW, COMPILER) },
  // blueprint (compiler) sits at the top of the graph — no sibling limits.

  // Tests may reach across packages freely (integration coverage).
  {
    files: ['packages/*/src/**/*.test.{ts,tsx}', 'packages/*/src/__tests__/**/*'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },
);

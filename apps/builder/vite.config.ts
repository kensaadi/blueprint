import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Builder is a standalone Vite app inside the monorepo. It consumes
// the extracted @dashforge/blueprint-core (workspace) — NOT the sandbox.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
});

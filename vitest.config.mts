import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    // Match the `@/…` alias used across the app and by next.config.mjs
    alias: { '@': rootDir },
  },
});

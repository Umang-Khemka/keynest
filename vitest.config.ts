import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // Provides WXT auto-imports and an in-memory fake `browser` API in tests.
  plugins: [WxtVitest()],
  test: {
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.output', '.wxt'],
  },
});

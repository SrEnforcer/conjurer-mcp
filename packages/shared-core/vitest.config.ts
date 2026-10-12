import { defineConfig } from 'vitest/config';

// Run the sources only: tsc also emits compiled specs into dist/, which may be stale.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
  },
});

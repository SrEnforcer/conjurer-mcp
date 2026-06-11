import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    alias: {
      vscode: resolve(__dirname, 'src/mocks/vscode.ts'),
    },
  },
});

import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      MONGOMS_TMPDIR: 'E:\\Temp\\mongodb-mem',
      TEMP: 'E:\\Temp\\mongodb-mem',
      TMP: 'E:\\Temp\\mongodb-mem',
    },
  },
});

import { defineConfig } from 'vitest/config';

// MongoMemoryServer needs a temp dir with ample free space. This dev machine's C:
// (the default Windows temp) is near-full, so on Windows we redirect mongod's temp to
// E: unless MONGOMS_TMPDIR is already set. On other platforms (CI / the Linux VPS) we
// leave the OS default untouched so a Windows path is never forced cross-platform.
const memTmp =
  process.env.MONGOMS_TMPDIR ?? (process.platform === 'win32' ? 'E:\\Temp\\mongodb-mem' : undefined);

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      JWT_SECRET: 'test-jwt-secret-at-least-16-chars',
      ...(memTmp ? { MONGOMS_TMPDIR: memTmp, TEMP: memTmp, TMP: memTmp } : {}),
    },
  },
});

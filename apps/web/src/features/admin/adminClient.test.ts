// apps/web/src/features/admin/adminClient.test.ts
// Token-gate helpers were removed in Milestone 2 (auth now uses JWT cookies).
// This file kept as a placeholder; functional tests live in API integration tests.
import { describe, it } from 'vitest';

describe('adminClient', () => {
  it('module loads without errors', async () => {
    await import('./adminClient');
  });
});

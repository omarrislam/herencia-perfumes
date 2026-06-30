// apps/web/src/features/admin/adminClient.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getAdminToken, setAdminToken, adminHeaders } from './adminClient';

beforeEach(() => sessionStorage.clear());

describe('admin token storage', () => {
  it('persists and reads the token', () => {
    expect(getAdminToken()).toBe('');
    setAdminToken('secret-token-123456');
    expect(getAdminToken()).toBe('secret-token-123456');
    expect(adminHeaders()).toEqual({ 'x-admin-token': 'secret-token-123456' });
  });
});

import { describe, it, expect } from 'vitest';
import { addressSchema, updateProfileSchema, wishlistItemSchema } from './account';

describe('account schemas', () => {
  it('accepts a valid address', () => {
    expect(addressSchema.safeParse({ label: 'Home', line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' }).success).toBe(true);
  });
  it('rejects an address missing governorate', () => {
    expect(addressSchema.safeParse({ label: 'Home', line1: '1 St', city: 'Cairo', phone: '0100000000' }).success).toBe(false);
  });
  it('accepts an empty profile update', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });
  it('rejects a wishlist item with a bad id', () => {
    expect(wishlistItemSchema.safeParse({ productId: 'xyz' }).success).toBe(false);
  });
});

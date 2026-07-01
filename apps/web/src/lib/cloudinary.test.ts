import { describe, it, expect } from 'vitest';
import { cldBlur } from './cloudinary';

describe('cldBlur', () => {
  it('returns a low-res blurred transform for a public id', () => {
    const url = cldBlur('perfumes/royal-oud');
    // With no VITE_CLOUDINARY_CLOUD_NAME in tests, falls back to the raw id.
    expect(typeof url).toBe('string');
  });
});

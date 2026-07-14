import { describe, it, expect } from 'vitest';
import { samplesSettingsSchema, DEFAULT_SAMPLES_SETTINGS, updateSettingsSchema } from './settings';

describe('samplesSettingsSchema', () => {
  it('has complete defaults matching the live copy', () => {
    expect(DEFAULT_SAMPLES_SETTINGS.price).toBe(60);
    expect(DEFAULT_SAMPLES_SETTINGS.sizeLabel).toBe('5ml');
    expect(DEFAULT_SAMPLES_SETTINGS.steps).toHaveLength(3);
    expect(DEFAULT_SAMPLES_SETTINGS.ctaText).toContain('{price}');
    expect(samplesSettingsSchema.parse(DEFAULT_SAMPLES_SETTINGS)).toEqual(DEFAULT_SAMPLES_SETTINGS);
  });
  it('updateSettingsSchema accepts a partial samples object', () => {
    const r = updateSettingsSchema.parse({ samples: { price: 80 } });
    expect(r.samples).toEqual({ price: 80 });
  });
  it('rejects a non-positive price and wrong steps arity', () => {
    expect(() => samplesSettingsSchema.parse({ ...DEFAULT_SAMPLES_SETTINGS, price: 0 })).toThrow();
    expect(() => samplesSettingsSchema.parse({ ...DEFAULT_SAMPLES_SETTINGS, steps: ['a'] })).toThrow();
  });
});

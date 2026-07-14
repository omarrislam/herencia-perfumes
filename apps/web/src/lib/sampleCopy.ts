import type { SamplesSettings } from '@herencia/shared';
import { formatEGP } from '../components/Price';

// Interpolates the {price}/{size} tokens used in admin-editable samples copy.
export function applySampleTokens(
  text: string,
  s: Pick<SamplesSettings, 'price' | 'sizeLabel'>,
): string {
  return text.replaceAll('{price}', formatEGP(s.price)).replaceAll('{size}', s.sizeLabel);
}

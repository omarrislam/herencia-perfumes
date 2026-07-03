const CLOUD = (import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ?? '';

// Falls back to returning the raw value if it's already a URL or no cloud configured.
export function cld(publicId: string, opts: { w?: number } = {}): string {
  if (!publicId) return '';
  // Absolute URLs and local /public assets pass through untouched.
  if (/^https?:\/\//.test(publicId) || publicId.startsWith('/') || !CLOUD) return publicId;
  const t = `f_auto,q_auto${opts.w ? `,w_${opts.w}` : ''}`;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${publicId}`;
}

export function cldSrcSet(publicId: string): string {
  if (!publicId || /^https?:\/\//.test(publicId) || !CLOUD) return '';
  return [400, 800, 1200].map((w) => `${cld(publicId, { w })} ${w}w`).join(', ');
}

export function cldBlur(publicId: string): string {
  if (!publicId || /^https?:\/\//.test(publicId) || !CLOUD) return publicId;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/w_24,e_blur:400,q_auto,f_auto/${publicId}`;
}

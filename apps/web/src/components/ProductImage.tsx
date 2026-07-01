import { cld, cldSrcSet, cldBlur } from '../lib/cloudinary';

export function ProductImage({
  publicId, alt, w = 800, className, loading = 'lazy',
  sizes = '(max-width: 640px) 100vw, 400px',
}: { publicId: string; alt: string; w?: number; className?: string; loading?: 'lazy' | 'eager'; sizes?: string }) {
  if (!publicId) return <div className={className} role="img" aria-label={alt} />;
  const srcSet = cldSrcSet(publicId);
  const blur = cldBlur(publicId);
  // Only use the blur-up background when it's a real (Cloudinary) URL — cldBlur
  // returns the raw id when no cloud is configured, which would be invalid CSS.
  const hasBlur = /^https?:\/\//.test(blur);
  return (
    <img
      src={cld(publicId, { w })}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt}
      loading={loading}
      decoding="async"
      style={hasBlur ? { backgroundImage: `url(${blur})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      className={className}
    />
  );
}

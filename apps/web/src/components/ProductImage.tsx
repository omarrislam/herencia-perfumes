import { cld, cldSrcSet } from '../lib/cloudinary';

export function ProductImage({ publicId, alt, w = 800, className, loading = 'lazy' }: { publicId: string; alt: string; w?: number; className?: string; loading?: 'lazy' | 'eager' }) {
  if (!publicId) {
    return <div className={className} role="img" aria-label={alt} />;
  }
  const srcSet = cldSrcSet(publicId);
  return (
    <img
      src={cld(publicId, { w })}
      {...(srcSet ? { srcSet, sizes: '(max-width: 640px) 100vw, 400px' } : {})}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
    />
  );
}

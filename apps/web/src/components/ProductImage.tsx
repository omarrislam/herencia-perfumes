import { cld, cldSrcSet } from '../lib/cloudinary';

export function ProductImage({ publicId, alt, w = 800, className }: { publicId: string; alt: string; w?: number; className?: string }) {
  const srcSet = cldSrcSet(publicId);
  return (
    <img
      src={cld(publicId, { w })}
      {...(srcSet ? { srcSet, sizes: '(max-width: 640px) 100vw, 400px' } : {})}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

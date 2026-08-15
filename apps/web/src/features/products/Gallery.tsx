import { useState } from 'react';
import { ProductImage } from '../../components/ProductImage';
import { ScentTrail } from '../../components/ScentTrail';

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  return (
    <div>
      {/* data-gallery-main: the fly-to-cart animation clones this image. */}
      <div data-gallery-main className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-hairline bg-surface2 shadow-lux-sm">
        <ProductImage publicId={main} alt={alt} w={1200} className="h-full w-full object-cover" />
        {/* Scent rising off the bottle — the same vocabulary as the hero, on the
            page where someone is actually deciding. Hidden under reduced motion
            by the .wisp/.mote rules. */}
        <ScentTrail />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2.5">
          {images.map((img, i) => (
            <button
              key={i} type="button" onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${i === active ? 'border-accent' : 'border-transparent hover:border-hairline'}`}
            >
              <ProductImage publicId={img} alt={`${alt} thumbnail ${i + 1}`} w={120} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

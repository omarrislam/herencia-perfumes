import { useState } from 'react';
import { ProductImage } from '../../components/ProductImage';

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border border-line bg-surface">
        <ProductImage publicId={main} alt={alt} w={1200} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {images.map((img, i) => (
            <button
              key={img + i} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}
              className={`h-16 w-16 overflow-hidden rounded-md border ${i === active ? 'border-gold' : 'border-line'}`}
            >
              <ProductImage publicId={img} alt={`${alt} thumbnail ${i + 1}`} w={120} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

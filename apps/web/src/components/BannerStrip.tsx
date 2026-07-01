import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { BannerPlacement } from '@herencia/shared';
import { fetchBanners } from '../lib/api';
import { cld } from '../lib/cloudinary';

interface BannerStripProps {
  placement: BannerPlacement;
}

export function BannerStrip({ placement }: BannerStripProps) {
  const { data: banners, isLoading } = useQuery({
    queryKey: ['banners', placement],
    queryFn: () => fetchBanners(placement),
  });

  if (isLoading || !banners || banners.length === 0) return null;

  const isHero = placement === 'home_hero';

  return (
    <div className={isHero ? 'space-y-4' : 'flex gap-2 overflow-x-auto'}>
      {banners.map((banner) => (
        <div
          key={banner.id}
          data-banner={banner.placement}
          className={
            isHero
              ? 'relative overflow-hidden rounded-xl border border-line bg-surface'
              : 'relative flex-shrink-0 rounded border border-line bg-surface px-4 py-2'
          }
        >
          {banner.image && (
            <img
              src={cld(banner.image)}
              alt={banner.title}
              className={isHero ? 'h-40 w-full object-cover opacity-70' : 'hidden'}
            />
          )}
          <div className={isHero ? 'absolute inset-0 flex flex-col justify-center p-6' : ''}>
            <p className={isHero ? 'font-display text-xl text-content' : 'font-body text-sm text-content'}>
              {banner.title}
            </p>
            {banner.subtitle && (
              <p className={isHero ? 'mt-1 font-body text-sm text-muted' : 'font-body text-xs text-muted'}>
                {banner.subtitle}
              </p>
            )}
            {banner.ctaLink && (
              banner.ctaLink.startsWith('/')
                ? <Link
                    to={banner.ctaLink}
                    className={
                      isHero
                        ? 'mt-3 inline-block rounded bg-maroon px-4 py-2 font-body text-sm text-cream hover:bg-maroon/90'
                        : 'mt-1 inline-block font-body text-xs text-accent hover:underline'
                    }
                  >
                    {banner.ctaText ?? 'Shop now'}
                  </Link>
                : <a
                    href={banner.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      isHero
                        ? 'mt-3 inline-block rounded bg-maroon px-4 py-2 font-body text-sm text-cream hover:bg-maroon/90'
                        : 'mt-1 inline-block font-body text-xs text-accent hover:underline'
                    }
                  >
                    {banner.ctaText ?? 'Shop now'}
                  </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

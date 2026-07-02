import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { BannerPlacement } from '@herencia/shared';
import { fetchBanners } from '../lib/api';
import { cld } from '../lib/cloudinary';

const isSafeExternal = (url: string) => /^(https?:|mailto:|tel:)/i.test(url);

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
  const ctaClass = isHero ? 'btn-lux mt-4 self-start' : 'link-underline font-body text-xs text-accent';

  return (
    <div className={isHero ? 'space-y-4' : 'flex flex-wrap gap-2'}>
      {banners.map((banner) => (
        <div
          key={banner.id}
          data-banner={banner.placement}
          className={
            isHero
              ? 'relative overflow-hidden rounded-2xl shadow-lux'
              : 'flex flex-shrink-0 items-center gap-3 rounded-full border border-hairline bg-surface2 px-5 py-2'
          }
        >
          {banner.image && (
            <img
              src={cld(banner.image)}
              alt={banner.title}
              className={isHero ? 'h-64 w-full object-cover md:h-80' : 'hidden'}
            />
          )}
          {isHero && <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />}
          <div className={isHero ? 'absolute inset-0 flex flex-col justify-end p-8 md:p-10' : 'flex items-center gap-3'}>
            {isHero && <p className="eyebrow text-gold-hi">Featured</p>}
            <p className={isHero ? 'mt-2 font-display text-2xl text-cream md:text-3xl' : 'font-body text-sm text-content'}>
              {banner.title}
            </p>
            {banner.subtitle && (
              <p className={isHero ? 'mt-1 max-w-md font-body text-sm text-cream/80' : 'font-body text-xs text-muted'}>
                {banner.subtitle}
              </p>
            )}
            {banner.ctaLink &&
              (banner.ctaLink.startsWith('/') ? (
                <Link to={banner.ctaLink} className={ctaClass}>
                  {banner.ctaText ?? 'Shop now'}
                </Link>
              ) : isSafeExternal(banner.ctaLink) ? (
                <a href={banner.ctaLink} target="_blank" rel="noopener noreferrer" className={ctaClass}>
                  {banner.ctaText ?? 'Shop now'}
                </a>
              ) : null)}
          </div>
        </div>
      ))}
    </div>
  );
}

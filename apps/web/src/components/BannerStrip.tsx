import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { BannerPlacement } from '@herencia/shared';
import { fetchBanners } from '../lib/api';
import { cld } from '../lib/cloudinary';

const isSafeExternal = (url: string) => /^(https?:|mailto:|tel:)/i.test(url);

function Cta({ link, text, className }: { link: string; text: string; className: string }) {
  if (link.startsWith('/')) return <Link to={link} className={className}>{text}</Link>;
  if (isSafeExternal(link))
    return <a href={link} target="_blank" rel="noopener noreferrer" className={className}>{text}</a>;
  return null;
}

export function BannerStrip({ placement }: { placement: BannerPlacement }) {
  const { data: banners, isLoading } = useQuery({
    queryKey: ['banners', placement],
    queryFn: () => fetchBanners(placement),
  });

  if (isLoading || !banners || banners.length === 0) return null;

  // Cinematic hero banner(s).
  if (placement === 'home_hero') {
    return (
      <div className="space-y-4">
        {banners.map((banner) => (
          <div key={banner.id} data-banner={banner.placement} className="relative overflow-hidden rounded-2xl shadow-lux">
            {banner.image && (
              <img src={cld(banner.image, { w: 1600 })} alt={banner.title} className="h-64 w-full object-cover md:h-80" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
              <p className="eyebrow text-gold-hi">Featured</p>
              <p className="mt-2 font-display text-2xl text-cream md:text-3xl">{banner.title}</p>
              {banner.subtitle && <p className="mt-1 max-w-md font-body text-sm text-cream/80">{banner.subtitle}</p>}
              {banner.ctaLink && (
                <Cta link={banner.ctaLink} text={banner.ctaText ?? 'Shop now'} className="btn-lux mt-4 self-start" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Slim full-width centered announcement bar (global_top / home_strip).
  return (
    <div className="w-full border-y border-hairline bg-surface2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2.5 text-center">
        {banners.map((banner) => (
          <div key={banner.id} data-banner={banner.placement} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
            <span className="font-body text-sm text-content">{banner.title}</span>
            {banner.subtitle && <span className="font-body text-xs text-muted">{banner.subtitle}</span>}
            {banner.ctaLink && (
              <Cta link={banner.ctaLink} text={banner.ctaText ?? 'Shop now'} className="link-underline font-body text-xs font-medium text-accent" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

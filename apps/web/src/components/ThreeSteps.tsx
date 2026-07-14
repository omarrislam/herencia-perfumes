import { useQuery } from '@tanstack/react-query';
import { DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import { useSamples } from '../features/samples/SampleContext';
import { fetchSettings } from '../lib/api';
import { applySampleTokens } from '../lib/sampleCopy';
import { formatEGP } from './Price';

// The samples pitch — compact, marketing-led, and unmistakably about SAMPLES
// (the old three-card "3 Steps" band buried the subject and ran a full screen).
export function ThreeSteps() {
  const { open } = useSamples();
  // All copy + price is admin-editable via Settings → Samples.
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60_000 });
  const s = settings.data?.samples ?? DEFAULT_SAMPLES_SETTINGS;
  const t = (text: string) => applySampleTokens(text, s);

  return (
    <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
      <div>
        <p className="eyebrow">{s.eyebrow}</p>
        <h2 className="display mt-3 whitespace-pre-line text-4xl leading-[1.05] text-content md:text-5xl">
          {s.heading}
        </h2>
        <p className="mt-4 max-w-md font-body text-lg text-accent-strong">{t(s.strapline)}</p>

        <ul className="mt-6 space-y-2.5">
          {s.steps.map((text, i) => (
            <li key={i} className="flex items-center gap-3 font-body text-sm text-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/12 font-display text-xs text-accent">
                {String(i + 1)}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => open()} className="btn-lux mt-8">
          {t(s.ctaText)}
        </button>
      </div>

      <div className="relative">
        <img
          src="/sample-choose.webp"
          alt="A HERENCIA discovery box of sample vials"
          loading="lazy"
          className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lux"
        />
        {/* Price sticker — the marketing anchor */}
        <div
          aria-hidden="true"
          className="absolute -right-3 -top-5 flex h-24 w-24 -rotate-6 flex-col items-center justify-center rounded-full bg-accent text-espresso shadow-lux"
        >
          <span className="font-body text-[10px] uppercase tracking-wider">{t(s.stickerTop)}</span>
          <span className="font-display text-lg font-semibold leading-tight">{formatEGP(s.price)}</span>
          <span className="font-body text-[10px] uppercase tracking-wider">{t(s.stickerBottom)}</span>
        </div>
      </div>
    </section>
  );
}

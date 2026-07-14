import { useQuery } from '@tanstack/react-query';
import { SAMPLE_PRODUCT } from '@herencia/shared';
import { useSamples } from '../features/samples/SampleContext';
import { fetchProduct } from '../lib/api';
import { formatEGP } from './Price';

// The samples pitch — compact, marketing-led, and unmistakably about SAMPLES
// (the old three-card "3 Steps" band buried the subject and ran a full screen).
const STEPS: [string, string][] = [
  ['1', 'Pick any scents from the collection'],
  ['2', 'Wear each one for a full day'],
  ['3', 'Sample price credited to your bottle'],
];

export function ThreeSteps() {
  const { open } = useSamples();
  // Live sample price (admin-editable); falls back to the seed default.
  const sample = useQuery({
    queryKey: ['product', SAMPLE_PRODUCT.slug],
    queryFn: () => fetchProduct(SAMPLE_PRODUCT.slug),
    retry: false,
    staleTime: 60_000,
  });
  // Label AND price come from the sample product's (admin-edited) first size.
  const size = sample.data?.sizes[0];
  const label = size?.label ?? SAMPLE_PRODUCT.sizeLabel;
  const price = size?.price ?? SAMPLE_PRODUCT.price;

  return (
    <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
      <div>
        <p className="eyebrow">Try before you commit</p>
        <h2 className="display mt-3 text-4xl leading-[1.05] text-content md:text-5xl">
          Samples first.
          <br />
          Bottles later.
        </h2>
        <p className="mt-4 max-w-md font-body text-lg text-accent-strong">
          Any scent · {label} vial · {formatEGP(price)} each — credited back when you buy the bottle.
        </p>

        <ul className="mt-6 space-y-2.5">
          {STEPS.map(([n, text]) => (
            <li key={n} className="flex items-center gap-3 font-body text-sm text-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/12 font-display text-xs text-accent">
                {n}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => open()} className="btn-lux mt-8">
          Order samples · {formatEGP(price)} each
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
          <span className="font-body text-[10px] uppercase tracking-wider">{label} from</span>
          <span className="font-display text-lg font-semibold leading-tight">{formatEGP(price)}</span>
          <span className="font-body text-[10px] uppercase tracking-wider">per sample</span>
        </div>
      </div>
    </section>
  );
}

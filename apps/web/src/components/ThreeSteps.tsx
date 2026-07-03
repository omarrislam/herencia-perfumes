import { useSamples } from '../features/samples/SampleContext';

const STEPS = [
  { n: '01', img: '/sample-choose.webp', title: 'Choose your fragrances', body: 'Add up to 5 samples to your box. Get personalized picks or build your own — from the full HERENCIA collection.' },
  { n: '02', img: '/sample-try.webp', title: 'Try at home', body: 'Receive 5 × 2ml samples in your box. Try them at your leisure and experience how they develop on your skin.' },
  { n: '03', img: '/sample-buy.webp', title: 'Buy what you love', body: "We'll credit the full box value toward your bottle. Testing without extra cost — guaranteed." },
];

export function ThreeSteps() {
  const { open } = useSamples();
  return (
    <section>
      <div className="mb-10 text-center">
        <h2 className="display text-3xl text-content md:text-4xl">3 Steps to Your Favorite Fragrance</h2>
        <div className="rule-gold mx-auto mt-4 w-24" />
        <p className="mt-4 font-body text-muted">The easiest way to find your perfect fragrance.</p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n}>
            <div className="relative overflow-hidden rounded-xl shadow-lux">
              <img src={s.img} alt={s.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <span className="absolute left-4 top-4 flex h-9 min-w-[3rem] items-center justify-center rounded bg-espresso px-2 font-display text-sm tracking-wider text-cream">{s.n}</span>
            </div>
            <h3 className="mt-5 font-display text-lg uppercase tracking-wide text-content">{s.title}</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <button type="button" onClick={() => open()} className="btn-lux">Build your sample box</button>
      </div>
    </section>
  );
}

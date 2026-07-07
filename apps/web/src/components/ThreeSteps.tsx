import { useSamples } from '../features/samples/SampleContext';

const STEPS = [
  { n: '01', img: '/sample-choose.webp', title: 'Choose your fragrances', body: 'Pick up to 5 scents · 2ml each' },
  { n: '02', img: '/sample-try.webp', title: 'Try at home', body: 'Test them on your skin, at home' },
  { n: '03', img: '/sample-buy.webp', title: 'Buy what you love', body: 'Full sample value credited to your bottle' },
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
          <div key={s.n} className="group">
            <div className="relative overflow-hidden rounded-xl shadow-lux">
              <img
                src={s.img}
                alt={s.title}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07] motion-reduce:transform-none motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-espresso/0 transition-colors duration-500 group-hover:bg-espresso/15" />
              <span className="absolute left-4 top-4 flex h-9 min-w-[3rem] items-center justify-center rounded bg-espresso px-2 font-display text-sm tracking-wider text-gold-hi">{s.n}</span>
            </div>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-sm text-accent/70">{s.n}</span>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent-strong transition-colors group-hover:text-accent">{s.title}</h3>
            </div>
            <div className="mt-2 h-px w-10 bg-accent/40 transition-all duration-500 group-hover:w-16" />
            <p className="mt-3 font-body text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <button type="button" onClick={() => open()} className="btn-lux">Order your samples</button>
      </div>
    </section>
  );
}

// The hero's signature brand animation: fragrance wisps rising and dissolving,
// with gold motes drifting up like droplets of scent. Pure CSS (.wisp/.mote in
// index.css) — transforms/opacity only, hidden under prefers-reduced-motion.

// Motes: left%, bottom%, size px, delay s, duration s.
const MOTES: [string, string, number, string, string][] = [
  ['12%', '18%', 3, '0s', '9s'],
  ['22%', '6%', 2, '3.2s', '11s'],
  ['38%', '12%', 2, '6.1s', '10s'],
  ['55%', '8%', 3, '1.6s', '9.5s'],
  ['67%', '22%', 2, '4.8s', '12s'],
  ['78%', '10%', 4, '2.4s', '10.5s'],
  ['88%', '16%', 2, '7.3s', '9s'],
  ['94%', '30%', 3, '5.5s', '11.5s'],
];

// Serpentine wisp paths (drawn bottom → top, like vapor curling upward).
const WISPS: { d: string; delay: string; duration: string }[] = [
  { d: 'M60 292 C 28 244, 92 204, 60 152 C 30 104, 88 62, 62 8', delay: '0s', duration: '11s' },
  { d: 'M90 296 C 64 252, 118 212, 92 164 C 68 120, 112 76, 90 24', delay: '3.6s', duration: '13s' },
  { d: 'M32 288 C 12 248, 52 212, 30 168 C 12 130, 46 92, 28 44', delay: '7.2s', duration: '12s' },
];

export function ScentTrail() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-gold-hi" aria-hidden="true">
      {/* Wisps rise through the open right side of the hero (text sits left). */}
      <svg
        viewBox="0 0 120 300"
        fill="none"
        className="absolute bottom-[6%] right-[8%] hidden h-[52%] w-auto sm:block"
      >
        {WISPS.map((w) => (
          <path
            key={w.d}
            d={w.d}
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            className="wisp"
            style={{ animationDelay: w.delay, animationDuration: w.duration }}
          />
        ))}
      </svg>
      {MOTES.map(([left, bottom, size, delay, duration], i) => (
        <span
          key={i}
          className="mote"
          style={{ left, bottom, width: size, height: size, animationDelay: delay, animationDuration: duration }}
        />
      ))}
    </div>
  );
}

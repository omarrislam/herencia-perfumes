// Branded loading state — matches the first-load splash in index.html for a
// seamless handoff while lazy route chunks load.
export function PageLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-espresso">
      <div className="flex flex-col items-center gap-[18px]">
        <img src="/logo.png" alt="" className="h-[76px] w-[76px] motion-safe:animate-[splashPulse_1.8s_ease-in-out_infinite]" />
        <span className="pl-[0.35em] font-display text-[15px] tracking-[0.35em] text-cream">HERENCIA</span>
        <div className="relative h-0.5 w-[130px] overflow-hidden rounded bg-[#cfa862]/20">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#cfa862] to-transparent motion-safe:animate-[splashSlide_1.3s_linear_infinite]" />
        </div>
      </div>
    </div>
  );
}

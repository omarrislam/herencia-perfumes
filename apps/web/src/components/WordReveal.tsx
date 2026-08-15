/**
 * Reveals a line of text word by word, each rising from behind its own clip.
 *
 * Used for the hero headline — the first thing a visitor sees, and the one place
 * worth spending real motion on. Mount-based CSS only, so it never depends on
 * scroll position and cannot strand text off-screen the way a scroll-reveal can.
 *
 * The whole string stays in the accessibility tree as one label; the per-word
 * spans are hidden from assistive tech so a screen reader hears a sentence
 * rather than a list of words.
 */
export function WordReveal({
  text,
  className = '',
  delay = 0,
  step = 90,
}: {
  text: string;
  className?: string;
  /** ms before the first word moves. */
  delay?: number;
  /** ms between consecutive words. */
  step?: number;
}) {
  // Newlines are meaningful in the hero headline ("Samples first.\nBottles later.").
  const lines = text.split('\n');
  let index = 0;

  return (
    <span className={className} aria-label={text}>
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" className="block">
          {line.split(/\s+/).filter(Boolean).map((word, wi) => {
            const at = delay + index * step;
            index += 1;
            return (
              <span key={`${li}-${wi}`}>
                <span className="word-mask">
                  <span className="word-rise" style={{ animationDelay: `${at}ms` }}>
                    {word}
                  </span>
                </span>{' '}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

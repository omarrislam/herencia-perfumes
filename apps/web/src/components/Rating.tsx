export function Rating({ avg, count }: { avg: number; count: number }) {
  // Renders nothing until there is something to say. "No reviews yet" on every
  // card advertises an absence — silence is neutral, that sentence is a negative
  // claim repeated down the whole grid. The reviews section on the product page
  // still invites the first review; a thumbnail is the wrong place to ask.
  if (count === 0) return null;
  const full = Math.round(avg);
  return (
    <span className="font-body text-sm text-accent" aria-label={`Rated ${avg} of 5 from ${count} reviews`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)} <span className="text-muted">({count})</span>
    </span>
  );
}

export function Rating({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span className="font-body text-sm text-muted">No reviews yet</span>;
  const full = Math.round(avg);
  return (
    <span className="font-body text-sm text-accent" aria-label={`Rated ${avg} of 5 from ${count} reviews`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)} <span className="text-muted">({count})</span>
    </span>
  );
}

export function formatEGP(n: number): string {
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return `EGP ${n.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function Price({ value, compareAt }: { value: number; compareAt?: number }) {
  return (
    <span className="font-body">
      <span className="text-content">{formatEGP(value)}</span>
      {compareAt && compareAt > value ? (
        <span className="ml-2 text-muted line-through">{formatEGP(compareAt)}</span>
      ) : null}
    </span>
  );
}

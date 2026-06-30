export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/40 ${className}`} aria-hidden="true" />;
}

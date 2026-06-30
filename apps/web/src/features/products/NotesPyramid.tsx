export function NotesPyramid({ notes }: { notes: { top: string[]; heart: string[]; base: string[] } }) {
  const rows: { label: string; items: string[] }[] = [
    { label: 'Top', items: notes.top },
    { label: 'Heart', items: notes.heart },
    { label: 'Base', items: notes.base },
  ];
  if (rows.every((r) => r.items.length === 0)) return null;
  return (
    <dl className="space-y-3">
      {rows.map((r) =>
        r.items.length > 0 ? (
          <div key={r.label} className="flex gap-3">
            <dt className="w-16 shrink-0 font-display text-accent">{r.label}</dt>
            <dd className="font-body text-content">{r.items.join(' · ')}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}

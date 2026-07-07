// Parfinity-style fragrance pyramid: Top / Heart / Base groups, each note as a
// square tile (Cinzel initial + name). Groups with no notes are hidden.
export function NotesPyramid({ notes }: { notes: { top: string[]; heart: string[]; base: string[] } }) {
  const rows: { label: string; hint: string; items: string[] }[] = [
    { label: 'Top Notes', hint: 'The opening', items: notes.top },
    { label: 'Heart Notes', hint: 'The character', items: notes.heart },
    { label: 'Base Notes', hint: 'The trail', items: notes.base },
  ];
  if (rows.every((r) => r.items.length === 0)) return null;
  return (
    <section aria-label="Fragrance notes" className="space-y-5">
      <div>
        <p className="eyebrow">The composition</p>
        <h2 className="display mt-1 text-xl text-content">Fragrance notes</h2>
      </div>
      {rows.map((r) =>
        r.items.length > 0 ? (
          <div key={r.label}>
            <div className="mb-2.5 flex items-baseline gap-2">
              <h3 className="font-display text-sm tracking-wide text-content">{r.label}</h3>
              <span className="font-body text-xs text-muted">{r.hint}</span>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {r.items.map((note) => (
                <li key={note} className="w-[4.6rem] text-center">
                  <span
                    aria-hidden="true"
                    className="flex aspect-square w-full items-center justify-center rounded-lg border border-hairline bg-surface2 font-display text-2xl text-accent transition-colors hover:border-accent"
                  >
                    {note.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="mt-1.5 block font-body text-[11px] capitalize leading-tight text-content">
                    {note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}

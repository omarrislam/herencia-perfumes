import { useQuery } from '@tanstack/react-query';
import { fetchNoteIcons } from '../../lib/api';
import { builtinNoteImage } from '../../lib/noteLibrary';
import { cld } from '../../lib/cloudinary';

// Parfinity-style fragrance pyramid: Top / Heart / Base groups, each note as a
// square photo tile. Icons resolve custom (admin-uploaded) → built-in library →
// initial-letter fallback. Groups with no notes are hidden.
export function NotesPyramid({ notes }: { notes: { top: string[]; heart: string[]; base: string[] } }) {
  const icons = useQuery({ queryKey: ['note-icons'], queryFn: fetchNoteIcons, staleTime: 5 * 60_000 });
  const custom = new Map((icons.data ?? []).map((i) => [i.name.toLowerCase(), i.image]));

  const imageFor = (note: string): string | null => {
    const publicId = custom.get(note.trim().toLowerCase());
    if (publicId) {
      const url = cld(publicId, { w: 192 });
      if (/^https?:\/\//.test(url)) return url;
    }
    return builtinNoteImage(note);
  };

  const rows: { label: string; hint: string; items: string[] }[] = [
    { label: 'Top Notes', hint: 'The opening', items: notes.top },
    { label: 'Heart Notes', hint: 'The character', items: notes.heart },
    { label: 'Base Notes', hint: 'The trail', items: notes.base },
  ];
  if (rows.every((r) => r.items.length === 0)) return null;

  // Tiles appear in the order the scent actually unfolds: top notes first, then
  // heart, then base. Rows are offset from each other and tiles within a row cascade.
  // The per-tile step is capped so a long note list never leaves the last tiles
  // invisible for an uncomfortable stretch.
  const ROW_STEP_MS = 130;
  const TILE_STEP_MS = 45;
  const MAX_TILE_STEPS = 8;
  const delayFor = (rowIndex: number, tileIndex: number) =>
    rowIndex * ROW_STEP_MS + Math.min(tileIndex, MAX_TILE_STEPS) * TILE_STEP_MS;
  return (
    <section aria-label="Fragrance notes" className="space-y-5">
      <div>
        <p className="eyebrow">The composition</p>
        <h2 className="display mt-1 text-xl text-content">Fragrance notes</h2>
      </div>
      {rows.map((r, rowIndex) =>
        r.items.length > 0 ? (
          <div key={r.label}>
            <div className="mb-2.5 flex items-baseline gap-2">
              <h3 className="font-display text-sm tracking-wide text-content">{r.label}</h3>
              <span className="font-body text-xs text-muted">{r.hint}</span>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {r.items.map((note, tileIndex) => {
                const img = imageFor(note);
                return (
                  <li
                    key={note}
                    className="note-tile w-[4.6rem] text-center"
                    style={{ animationDelay: `${delayFor(rowIndex, tileIndex)}ms` }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-lg border border-hairline object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex aspect-square w-full items-center justify-center rounded-lg border border-hairline bg-surface2 font-display text-2xl text-accent"
                      >
                        {note.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="mt-1.5 block font-body text-[11px] capitalize leading-tight text-content">
                      {note}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}

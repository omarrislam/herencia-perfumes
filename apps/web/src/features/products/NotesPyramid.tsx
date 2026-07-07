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
              {r.items.map((note) => {
                const img = imageFor(note);
                return (
                  <li key={note} className="w-[4.6rem] text-center">
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

// Built-in fragrance-note icon library. Images live in /public/notes/<slug>.webp.
// Admin-uploaded custom icons (from /api/notes) take precedence by note name.

export const NOTE_LIBRARY: { slug: string; name: string }[] = [
  { slug: 'amber', name: 'Amber' },
  { slug: 'ambergris', name: 'Ambergris' },
  { slug: 'apple', name: 'Apple' },
  { slug: 'benzoin', name: 'Benzoin' },
  { slug: 'bergamot', name: 'Bergamot' },
  { slug: 'black-pepper', name: 'Black Pepper' },
  { slug: 'bulgarian-rose', name: 'Bulgarian Rose' },
  { slug: 'caramel', name: 'Caramel' },
  { slug: 'cardamom', name: 'Cardamom' },
  { slug: 'cedar', name: 'Cedar' },
  { slug: 'coriander', name: 'Coriander' },
  { slug: 'cypress', name: 'Cypress' },
  { slug: 'fir-balsam', name: 'Fir Balsam' },
  { slug: 'geranium', name: 'Geranium' },
  { slug: 'ginger', name: 'Ginger' },
  { slug: 'grapefruit', name: 'Grapefruit' },
  { slug: 'guaiac-wood', name: 'Guaiac Wood' },
  { slug: 'honey', name: 'Honey' },
  { slug: 'incense', name: 'Incense' },
  { slug: 'jasmine', name: 'Jasmine' },
  { slug: 'juniper', name: 'Juniper' },
  { slug: 'lavender', name: 'Lavender' },
  { slug: 'leather', name: 'Leather' },
  { slug: 'lemon', name: 'Lemon' },
  { slug: 'lime', name: 'Lime' },
  { slug: 'magnolia', name: 'Magnolia' },
  { slug: 'musk', name: 'Musk' },
  { slug: 'neroli', name: 'Neroli' },
  { slug: 'oakmoss', name: 'Oakmoss' },
  { slug: 'orange', name: 'Orange' },
  { slug: 'orange-blossom', name: 'Orange Blossom' },
  { slug: 'oud', name: 'Oud' },
  { slug: 'patchouli', name: 'Patchouli' },
  { slug: 'peony', name: 'Peony' },
  { slug: 'pink-pepper', name: 'Pink Pepper' },
  { slug: 'raspberry', name: 'Raspberry' },
  { slug: 'rose', name: 'Rose' },
  { slug: 'saffron', name: 'Saffron' },
  { slug: 'sandalwood', name: 'Sandalwood' },
  { slug: 'sea-salt', name: 'Sea Salt' },
  { slug: 'thyme', name: 'Thyme' },
  { slug: 'tonka-bean', name: 'Tonka Bean' },
  { slug: 'vanilla', name: 'Vanilla' },
  { slug: 'vetiver', name: 'Vetiver' },
  { slug: 'violet', name: 'Violet' },
  { slug: 'white-musk', name: 'White Musk' },
  { slug: 'woods', name: 'Woods' },
  { slug: 'ylang-ylang', name: 'Ylang-Ylang' },
];

const SLUGS = new Set(NOTE_LIBRARY.map((n) => n.slug));

// Common synonyms → library slug (matched on the normalized note name).
const ALIASES: Record<string, string> = {
  'damascus rose': 'bulgarian-rose',
  'damask rose': 'bulgarian-rose',
  'may rose': 'rose',
  'rose de mai': 'rose',
  agarwood: 'oud',
  oudh: 'oud',
  cedarwood: 'cedar',
  'virginia cedar': 'cedar',
  'atlas cedar': 'cedar',
  frankincense: 'incense',
  olibanum: 'incense',
  moss: 'oakmoss',
  'balsam fir': 'fir-balsam',
  tonka: 'tonka-bean',
  pepper: 'black-pepper',
  'woody notes': 'woods',
  wood: 'woods',
  'orange zest': 'orange',
  mandarin: 'orange',
  citrus: 'lemon',
  'juniper berries': 'juniper',
};

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Static image path for a built-in note, or null when the library has no match.
export function builtinNoteImage(name: string): string | null {
  const key = normalize(name);
  const slug = ALIASES[key] ?? key.replace(/ /g, '-');
  return SLUGS.has(slug) ? `/notes/${slug}.webp` : null;
}

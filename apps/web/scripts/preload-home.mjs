// Injects <link rel="modulepreload"> for the Home route's chunk graph into
// dist/index.html. Home is a lazy route, so without this the landing page loads
// as a serial waterfall: entry JS runs → fetch Home chunk → run → fetch its
// vendor chunks (framer-motion etc). Preloading lets the browser download all
// of it in parallel with the entry, which is most of the LCP render delay on
// slow devices. Other routes stay fully lazy.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MANIFEST_PATH = fileURLToPath(new URL('../dist/.vite/manifest.json', import.meta.url));
const HTML_PATH = fileURLToPath(new URL('../dist/index.html', import.meta.url));

try {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

  const homeKey = Object.keys(manifest).find((k) => k.endsWith('src/pages/Home.tsx'));
  if (!homeKey) throw new Error('Home.tsx not found in manifest');

  // The entry's own static imports are already modulepreloaded by Vite — skip them.
  const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
  const alreadyLoaded = new Set([manifest[entryKey]?.file, ...(manifest[entryKey]?.imports ?? []).map((k) => manifest[k]?.file)]);

  const files = new Set();
  (function walk(key) {
    const chunk = manifest[key];
    if (!chunk || files.has(chunk.file)) return;
    if (!alreadyLoaded.has(chunk.file)) files.add(chunk.file);
    for (const imp of chunk.imports ?? []) walk(imp);
  })(homeKey);

  if (files.size === 0) throw new Error('nothing to preload');
  // fetchpriority=low keeps these from competing with the hero image download.
  const links = [...files]
    .map((f) => `<link rel="modulepreload" crossorigin fetchpriority="low" href="/${f}" />`)
    .join('\n    ');

  const html = await readFile(HTML_PATH, 'utf8');
  if (html.includes('rel="modulepreload"')) throw new Error('already injected');
  await writeFile(HTML_PATH, html.replace('</head>', `  ${links}\n  </head>`), 'utf8');
  console.log(`[preload-home] injected ${files.size} modulepreload links for the landing route`);
} catch (err) {
  // Fail soft — a plain build still works, just without the parallel preload.
  console.warn(`[preload-home] skipped: ${err instanceof Error ? err.message : err}`);
}

// Vercel serverless function. The real handler is bundled to dist/serverless.mjs
// by the buildCommand in apps/api/vercel.json — importing it with an explicit
// extension keeps ESM resolution working at runtime (the src tree is inlined there).
import handler from '../dist/serverless.mjs';

export default handler;

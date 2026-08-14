// Deliberately broad: over-flagging a crawler costs one uncounted session, while
// under-flagging inflates every funnel number on the dashboard. Bots are excluded
// at ingestion rather than at read time, so they never enter the numbers at all.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|screenshot|headless|phantom|puppeteer|playwright|lighthouse|curl|wget|python-requests|axios|go-http|java\/|okhttp|scrapy|monitor|uptime|pingdom|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|perplexity/i;

const MOBILE_PATTERN = /mobile|android|iphone|ipad|ipod|windows phone|iemobile|blackberry|opera mini/i;

/** A missing user-agent counts as a bot: every real browser sends one. */
export function isBot(ua: string | undefined): boolean {
  if (!ua) return true;
  return BOT_PATTERN.test(ua);
}

export function deviceFrom(ua: string | undefined): 'mobile' | 'desktop' {
  if (!ua) return 'desktop';
  return MOBILE_PATTERN.test(ua) ? 'mobile' : 'desktop';
}

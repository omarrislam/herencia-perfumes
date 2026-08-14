import type { EventType } from '@herencia/shared';

export const SESSION_IDLE_MS = 30 * 60 * 1000;

const VISITOR_KEY = 'herencia.visitor';
const SESSION_KEY = 'herencia.session';
const SEEN_KEY = 'herencia.session.seen';
const UTM_KEY = 'herencia.utm';
const LANDING_KEY = 'herencia.landing';
const REFERRER_KEY = 'herencia.referrer';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function rid(): string {
  const raw = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return raw.replace(/-/g, '');
}

// Storage throws in private mode and when the quota is full. Tracking is
// best-effort, so every access degrades quietly instead of breaking the page.
function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode or quota exceeded */
  }
}

export function getVisitorId(): string {
  const existing = safeGet(localStorage, VISITOR_KEY);
  if (existing) return existing;
  const id = rid();
  safeSet(localStorage, VISITOR_KEY, id);
  return id;
}

/** A new id once the visitor has been idle for SESSION_IDLE_MS. */
export function getSessionId(): string {
  const now = Date.now();
  const existing = safeGet(sessionStorage, SESSION_KEY);
  const seen = Number(safeGet(sessionStorage, SEEN_KEY) ?? 0);

  if (existing && now - seen < SESSION_IDLE_MS) {
    safeSet(sessionStorage, SEEN_KEY, String(now));
    return existing;
  }

  const id = rid();
  safeSet(sessionStorage, SESSION_KEY, id);
  safeSet(sessionStorage, SEEN_KEY, String(now));

  // Landing facts are captured exactly once, at session start: a later in-app
  // navigation must not overwrite the campaign that brought the visitor in.
  const params = new URLSearchParams(location.search);
  const utm = {
    source: params.get('utm_source') ?? undefined,
    medium: params.get('utm_medium') ?? undefined,
    campaign: params.get('utm_campaign') ?? undefined,
    content: params.get('utm_content') ?? undefined,
    term: params.get('utm_term') ?? undefined,
  };
  safeSet(sessionStorage, UTM_KEY, JSON.stringify(utm));
  safeSet(sessionStorage, LANDING_KEY, location.pathname);
  safeSet(sessionStorage, REFERRER_KEY, document.referrer || '');
  return id;
}

export function currentIds(): { sessionId: string; visitorId: string } {
  return { sessionId: getSessionId(), visitorId: getVisitorId() };
}

type Queued = { type: EventType; path: string; productSlug?: string };
let queue: Queued[] = [];

export function track(type: EventType, opts: { path?: string; productSlug?: string } = {}): void {
  queue.push({ type, path: opts.path ?? location.pathname, productSlug: opts.productSlug });
  if (queue.length >= 20) void flush();
}

export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const events = queue.slice(0, 50);
  queue = queue.slice(50);

  // MUST come first: getSessionId() is what captures and stores the landing UTMs.
  // Reading them before this call returned {} on the first batch of every session,
  // and the server's $setOnInsert then made that emptiness permanent.
  const sessionId = getSessionId();

  let utm: Record<string, string | undefined> = {};
  try {
    utm = JSON.parse(safeGet(sessionStorage, UTM_KEY) ?? '{}') as Record<string, string | undefined>;
  } catch {
    /* corrupt value — send the batch without campaign data rather than losing it */
  }

  const payload = JSON.stringify({
    session: {
      sessionId,
      visitorId: getVisitorId(),
      landingPath: safeGet(sessionStorage, LANDING_KEY) ?? location.pathname,
      referrer: safeGet(sessionStorage, REFERRER_KEY) || undefined,
      utm,
    },
    events,
  });

  const url = `${API_BASE}/api/events`;
  try {
    // sendBeacon survives the page being torn down mid-navigation, which is exactly
    // when the last events of a visit are queued.
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, payload);
      return;
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Tracking is best-effort and must never surface to the visitor.
  }
}

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { Event, RAW_EVENT_TTL_SECONDS } from './Event';
import { Session } from './Session';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

describe('analytics models', () => {
  it('expires raw events after 90 days', async () => {
    expect(RAW_EVENT_TTL_SECONDS).toBe(60 * 60 * 24 * 90);
    const idx = await Event.collection.indexes();
    const ttl = idx.find((i) => i.expireAfterSeconds !== undefined);
    expect(ttl?.expireAfterSeconds).toBe(RAW_EVENT_TTL_SECONDS);
  });

  it('expires sessions after 90 days', async () => {
    const idx = await Session.collection.indexes();
    const ttl = idx.find((i) => i.expireAfterSeconds !== undefined);
    expect(ttl?.expireAfterSeconds).toBe(RAW_EVENT_TTL_SECONDS);
  });

  it('keeps sessionId unique so upserts cannot duplicate a visit', async () => {
    await Session.create({ sessionId: 'S1', visitorId: 'V1', landingPath: '/' });
    await expect(Session.create({ sessionId: 'S1', visitorId: 'V2', landingPath: '/' })).rejects.toThrow();
  });

  it('rejects an event type outside the enum', async () => {
    await expect(
      Event.create({ type: 'nope', sessionId: 'S', visitorId: 'V', path: '/' }),
    ).rejects.toThrow();
  });

  it('defaults a session to not-a-bot on the desktop', async () => {
    const s = await Session.create({ sessionId: 'S2', visitorId: 'V1', landingPath: '/' });
    expect(s.isBot).toBe(false);
    expect(s.device).toBe('desktop');
  });
});

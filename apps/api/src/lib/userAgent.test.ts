import { describe, it, expect } from 'vitest';
import { isBot, deviceFrom } from './userAgent';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('isBot', () => {
  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'facebookexternalhit/1.1',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0)',
    'curl/8.4.0',
    'python-requests/2.31.0',
    'Vercel Screenshot Bot',
  ])('flags %s', (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it('does not flag real browsers', () => {
    expect(isBot(CHROME_DESKTOP)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });

  it('treats a missing user-agent as a bot — real browsers always send one', () => {
    expect(isBot(undefined)).toBe(true);
    expect(isBot('')).toBe(true);
  });
});

describe('deviceFrom', () => {
  it('detects mobile', () => {
    expect(deviceFrom(IPHONE)).toBe('mobile');
    expect(deviceFrom('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36')).toBe('mobile');
  });

  it('defaults to desktop', () => {
    expect(deviceFrom(CHROME_DESKTOP)).toBe('desktop');
    expect(deviceFrom(undefined)).toBe('desktop');
  });
});

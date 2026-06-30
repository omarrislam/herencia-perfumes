import jwt from 'jsonwebtoken';

export type TokenPayload = { sub: string; role: 'customer' | 'admin' };

function secret(): string {
  const s = process.env['JWT_SECRET'];
  if (!s || s.length < 16) throw new Error('JWT_SECRET missing or too short');
  return s;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), { algorithm: 'HS256', expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded === 'object' && decoded && 'sub' in decoded && 'role' in decoded) {
      return { sub: String(decoded.sub), role: (decoded as { role: 'customer' | 'admin' }).role };
    }
    return null;
  } catch {
    return null;
  }
}

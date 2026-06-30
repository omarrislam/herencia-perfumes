import { signToken } from '../lib/jwt';
import { AUTH_COOKIE } from '../lib/authCookie';

export function authCookie(userId: string, role: 'customer' | 'admin'): string {
  return `${AUTH_COOKIE}=${signToken({ sub: userId, role })}`;
}

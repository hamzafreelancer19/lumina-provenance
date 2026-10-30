import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function secretsMatch(input: string, expected: string) {
  const left = createHash('sha256').update(input, 'utf8').digest();
  const right = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(left, right);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash || !/^[0-9a-f]{64}$/i.test(hash)) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return timingSafeEqual(actual, expected);
}

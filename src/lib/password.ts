import { createHash, timingSafeEqual } from 'crypto';

export function secretsMatch(input: string, expected: string) {
  const left = createHash('sha256').update(input, 'utf8').digest();
  const right = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(left, right);
}

import { randomInt } from 'crypto';

/**
 * S1 — Generates a cryptographically-secure random password of the given
 * length.  Uses `crypto.randomInt` (CSPRNG) instead of `Math.random()` so
 * the output is not predictable even if the RNG state is observed.
 *
 * Guarantees at least one character from each required class before filling
 * the remaining positions from the full alphabet.  The final array is
 * shuffled with a Fisher-Yates shuffle driven by `crypto.randomInt`.
 */
export const generateRandomPassword = (length: number): string => {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const digits  = '0123456789';
  const special = '!@#$%^&*_-+=';
  const all     = upper + lower + digits + special;

  const pick = (charset: string): string =>
    charset[randomInt(charset.length)];

  // Ensure every required character class is represented.
  const chars: string[] = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(special),
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(pick(all));
  }

  // Fisher-Yates shuffle — every permutation equally likely.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

export const removeKey = <T>(obj: T, keyToRemove: keyof T): T => {
  const { [keyToRemove]: _, ...rest } = obj;
  return rest as T;
};

export const sleep = (timeout: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, timeout));

export const countString = (value: string, string: string): number =>
  value.split(string).length - 1;

export const generateNameVariations = (name: string): string[] => [
  name.toLowerCase(),
  name.toUpperCase(),
  name.charAt(0).toUpperCase() + name.slice(1),
  name.charAt(0).toLowerCase() + name.slice(1),
  name,
];

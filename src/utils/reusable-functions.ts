/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { isAfter, isBefore } from 'date-fns';

const getRandomChar = (charSet: string): string => {
  const randomIndex = Math.floor(Math.random() * charSet.length);
  return charSet[randomIndex];
};

export const generateRandomPassword = (length: number): string => {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const digitChars = '0123456789';
  const specialChars = '!@#$%^&*_-+=';

  // Ensure at least one character from each character set
  let password =
    getRandomChar(uppercaseChars) +
    getRandomChar(lowercaseChars) +
    getRandomChar(digitChars) +
    getRandomChar(specialChars);

  // Fill the remaining characters with random characters from all sets
  const remainingLength = length - password.length;
  const allChars = uppercaseChars + lowercaseChars + digitChars + specialChars;
  for (let i = 0; i < remainingLength; i++) {
    password += getRandomChar(allChars);
  }

  // Shuffle the password to randomize the order of characters
  const shuffledPassword = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

  return shuffledPassword;
};

export const removeKey = <T>(obj: T, keyToRemove: keyof T): T => {
  const { [keyToRemove]: _, ...rest } = obj;
  return rest as T;
};

export const sleep = (timeout: number) => {
  return new Promise<void>((resolve) => setTimeout(resolve, timeout));
};

export const countString = (value: string, string: string): number => {
  return value.split(string).length - 1;
};

export const isDateAfter = (date1: Date, date2: Date): boolean => {
  return isAfter(date1, date2);
};

export const isDateInPast = (date: Date): boolean => {
  const today = new Date();
  // Remove the time part to consider only the date
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return isBefore(date, todayStart);
};

export const generateNameVariations = (name: string): string[] => {
  return [
    name.toLowerCase(), // lowercase
    name.toUpperCase(), // uppercase
    name.charAt(0).toUpperCase() + name.slice(1), // Pascal case
    name.charAt(0).toLowerCase() + name.slice(1), // camel case
    name, // original
  ];
};

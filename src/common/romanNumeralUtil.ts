/* This file converts integers from zero through 999 to Roman numerals, using an empty string for zero.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

const hundreds = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'];
const tens = ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'];
const ones = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export function toNumeral(value:number):string {
  if (!Number.isInteger(value) || value < 0 || value > 999) return String(value);
  return hundreds[Math.floor(value / 100)] + tens[Math.floor(value / 10) % 10] + ones[value % 10];
}
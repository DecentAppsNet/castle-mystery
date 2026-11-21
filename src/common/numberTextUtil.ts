/* This file converts whole numbers from zero through 99 to English number text.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

const smallNumbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function toEnglishNumber(value:number):string {
  if (!Number.isInteger(value) || value < 0 || value > 99) return String(value);
  if (value < 20) return smallNumbers[value];
  const tensText = tens[Math.floor(value / 10)];
  const onesValue = value % 10;
  return onesValue === 0 ? tensText : `${tensText}-${smallNumbers[onesValue]}`;
}
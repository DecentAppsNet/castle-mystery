/* This file groups text quote conversion utilities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export function convertStraightQuotesToDirectional(text:string):string {
  return text.split('"').map((part, partI) => {
    if (partI === 0) return part;
    return (partI % 2 === 1 ? '\u201C' : '\u201D') + part;
  }).join('');
}
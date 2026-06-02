/* This module groups common numeric helper functions used across the codebase.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export function clamp(value:number, min:number, max:number) {
  return value < min
    ? min
    : value > max ? max : value;
}
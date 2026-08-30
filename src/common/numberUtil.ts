/* This file groups common numeric helper functions used across the codebase.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export function clamp(value:number, min:number, max:number) {
  return value < min
    ? min
    : value > max ? max : value;
}

export function interpolateNumber(from:number, to:number, progress:number):number {
  if (progress >= 1) return to;
  return from + (to - from) * progress;
}
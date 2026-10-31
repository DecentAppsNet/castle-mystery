/* This file groups common numeric helper functions used across the codebase.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

/** Restricts a value to the inclusive [min, max] interval. */
export function clamp(value:number, min:number, max:number) {
  return value < min
    ? min
    : value > max ? max : value;
}

/** Interpolates toward to, capping progress at 1 while allowing negative extrapolation. */
export function interpolateNumber(from:number, to:number, progress:number):number {
  if (progress >= 1) return to;
  return from + (to - from) * progress;
}

/** Interpolates each coordinate into a new pair, capping progress at 1 but not at 0. */
export function interpolateNumberPair(from:[number, number], to:[number, number], progress:number):[number, number] {
  if (progress >= 1) return [...to];
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress
  ];
}
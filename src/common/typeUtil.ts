/* This file groups general-purpose runtime type checks.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export function isStringArray(value:unknown):value is readonly string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string');
}
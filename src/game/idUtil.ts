/* This module groups identifier normalization and validation helpers for authored and runtime ids.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export function normalizeId(text:string):string {
  return text.trim().toLowerCase();
}

export function isNormalizedId(text:string):boolean {
  return text === normalizeId(text);
}

export function normalizeOptionalId(text:string|null|undefined):string|null {
  if (!text) return null;
  const normalizedText = normalizeId(text);
  return normalizedText.length ? normalizedText : null;
}
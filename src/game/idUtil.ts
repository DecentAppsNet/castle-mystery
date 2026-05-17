import { assert } from "decent-portal";

export function normalizeId(text:string):string {
  return text.trim().toLowerCase();
}

export function normalizeOptionalId(text:string|null|undefined):string|null {
  if (!text) return null;
  const normalizedText = normalizeId(text);
  return normalizedText.length ? normalizedText : null;
}

export function assertNormalizedId(value:string, label:string):void {
  assert(value === normalizeId(value), `expected normalized ${label} id: ${value}`);
}

export function createNormalizedEntryMap<T>(entries:ReadonlyArray<readonly [string, T]>):Map<string, { authoredName:string, value:T }> {
  const normalizedMap = new Map<string, { authoredName:string, value:T }>();
  entries.forEach(([authoredName, value]) => {
    const normalizedName = normalizeId(authoredName);
    const existingEntry = normalizedMap.get(normalizedName) || null;
    if (existingEntry) throw new Error(`duplicate normalized entry '${authoredName}' conflicts with '${existingEntry.authoredName}'`);
    normalizedMap.set(normalizedName, { authoredName, value });
  });
  return normalizedMap;
}
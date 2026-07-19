export function normalizeId(text:string):string {
  return text.trim().toLowerCase();
}

export function isNormalizedId(text:string):boolean {
  return text === normalizeId(text);
}
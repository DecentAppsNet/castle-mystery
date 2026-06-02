/* This module groups room-title layout helpers for wrapping and sizing room header text.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export function wrapRoomTitle(text:string, maxWidth:number, measureText:(text:string) => number):string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines:string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; ++i) {
    const nextLine = `${currentLine} ${words[i]}`;
    if (measureText(nextLine) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }
    lines.push(currentLine);
    currentLine = words[i];
  }

  lines.push(currentLine);
  return lines;
}
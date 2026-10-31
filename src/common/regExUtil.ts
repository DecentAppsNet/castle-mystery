/* This file groups shared regex-based text helpers for escaping and extracting common text patterns.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

/** Escapes regex metacharacters so text can be used as a literal pattern. */
export function escapeRegexCharacters(text:string):string {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/** Finds ASCII alphanumeric runs with internal apostrophes; offsets are zero-based with an exclusive end. */
export function findWordLikeTextSegments(text:string):Array<{ startIndex:number, endIndex:number, enclosedText:string }> {
  const wordLikeTextRegex = /[A-Za-z0-9]+(?:'[A-Za-z0-9]+)*/g;
  const segments:Array<{ startIndex:number, endIndex:number, enclosedText:string }> = [];

  let match = wordLikeTextRegex.exec(text);
  while (match) {
    segments.push({
      startIndex:match.index,
      endIndex:match.index + match[0].length,
      enclosedText:match[0]
    });
    match = wordLikeTextRegex.exec(text);
  }

  return segments;
}

/** Finds non-empty square-bracket contents; zero-based offsets include brackets and the end is exclusive. */
export function findSquareBracketEnclosedTextSegments(text:string):Array<{ startIndex:number, endIndex:number, enclosedText:string }> {
  const squareBracketEnclosedTextRegex = /\[([^\]]+)\]/g;
  const segments:Array<{ startIndex:number, endIndex:number, enclosedText:string }> = [];

  let match = squareBracketEnclosedTextRegex.exec(text);
  while (match) {
    segments.push({
      startIndex:match.index,
      endIndex:match.index + match[0].length,
      enclosedText:match[1]
    });
    match = squareBracketEnclosedTextRegex.exec(text);
  }

  return segments;
}

/** Removes the global flag from a regex, returning the original object when that flag is absent. */
export function createNonGlobalRegex(regex:RegExp):RegExp {
  if (!regex.global) return regex; // No change needed, so return unmodified regex.
  const flags = regex.flags.replace('g', '');
  return new RegExp(regex, flags);
}

/** Trims leading/trailing whitespace and replaces internal whitespace sequences with a single space. */
export function collapseWhitespace(text:string):string {
  return text.trim().replace(/\s+/g, ' ');
}
export function escapeRegexCharacters(text:string):string {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

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

export function createNonGlobalRegex(regex:RegExp):RegExp {
  if (!regex.global) return regex; // No change needed, so return unmodified regex.
  const flags = regex.flags.replace('g', '');
  return new RegExp(regex, flags);
}
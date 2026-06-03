/* This module groups sentence-style activity text parsing helpers shared across authored activity loaders.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

function _matchesSentenceStyleActivityVerb(trimmedActivityText:string, verb:string):boolean {
  if (!trimmedActivityText.startsWith(verb)) return false;
  const nextChar = trimmedActivityText.charAt(verb.length);
  return !nextChar || nextChar === ' ';
}

export function findSentenceStyleActivityVerb<Verb extends string>(activityText:string, verbs:readonly Verb[]):Verb|null {
  const trimmedActivityText = activityText.trim();
  return verbs.find(verb => _matchesSentenceStyleActivityVerb(trimmedActivityText, verb)) ?? null;
}

export function parseSentenceStyleActivityText(activityText:string, verb:string, contentType:string):string {
  const contentText = activityText.trim().slice(verb.length).trim();
  if (!contentText.length) throw new Error(`missing ${contentType} text in authored activity '${activityText}'`);
  if (contentText.startsWith('"')) {
    const closingQuoteIndex = contentText.lastIndexOf('"');
    if (closingQuoteIndex <= 0) throw new Error(`unterminated ${contentType} text in authored activity '${activityText}'`);
    return contentText.slice(1, closingQuoteIndex);
  }
  return contentText;
}

export function stripTrailingPeriod(text:string):string {
  const trimmedText = text.trim();
  return trimmedText.endsWith('.') ? trimmedText.slice(0, -1).trim() : trimmedText;
}
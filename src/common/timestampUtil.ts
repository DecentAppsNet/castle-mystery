import { MSECS_IN_SECOND, SECS_IN_MINUTE } from "./timeUtil";

export type LeadingTimestampKind = 'absolute' | 'after-previous-activity';

export type LeadingTimestamp = {
  timestampText:string,
  kind:LeadingTimestampKind,
  time:number|null,
  remainingText:string
};

function _isDigit(char:string):boolean {
  return char >= '0' && char <= '9';
}

function _isValidTimestampPart(part:string, requiredLength:number|null):boolean {
  if (!part.length) return false;
  if (requiredLength !== null && part.length !== requiredLength) return false;
  return Array.from(part).every(_isDigit);
}

export function parseTimestampToMsecs(text:string):number {
  const trimmedText = text.trim();
  const parts = trimmedText.split(':');
  if (parts.length !== 2 && parts.length !== 3) throw new Error(`invalid timestamp: ${text}`);
  const [hoursText, minutesText, secondsText] = parts;
  if (!_isValidTimestampPart(hoursText, null) || !_isValidTimestampPart(minutesText, 2)
    || (secondsText !== undefined && !_isValidTimestampPart(secondsText, 2))) {
    throw new Error(`invalid timestamp: ${text}`);
  }

  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = secondsText === undefined ? 0 : Number(secondsText);
  if (minutes >= SECS_IN_MINUTE || seconds >= SECS_IN_MINUTE) throw new Error(`invalid timestamp: ${text}`);
  return (((hours * SECS_IN_MINUTE) + minutes) * SECS_IN_MINUTE + seconds) * MSECS_IN_SECOND;
}

export function parseLeadingTimestamp(text:string):LeadingTimestamp|null {
  const trimmedLeftText = text.trimStart();
  if (!trimmedLeftText.length) return null;
  const firstWhitespaceIndex = Array.from(trimmedLeftText).findIndex(char => char === ' ' || char === '\t');
  const timestampText = firstWhitespaceIndex === -1 ? trimmedLeftText : trimmedLeftText.slice(0, firstWhitespaceIndex);
  if (timestampText === ':') {
    return {
      timestampText,
      kind:'after-previous-activity',
      time:null,
      remainingText:firstWhitespaceIndex === -1 ? '' : trimmedLeftText.slice(firstWhitespaceIndex).trim()
    };
  }
  try {
    return {
      timestampText,
      kind:'absolute',
      time:parseTimestampToMsecs(timestampText),
      remainingText:firstWhitespaceIndex === -1 ? '' : trimmedLeftText.slice(firstWhitespaceIndex).trim()
    };
  } catch {
    return null;
  }
}

export function lineBeginsWithTimestamp(text:string):boolean {
  return parseLeadingTimestamp(text) !== null;
}

/* This module groups timestamp parsing and formatting helpers for authored itinerary and timeline text.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { MSECS_IN_SECOND, SECS_IN_MINUTE } from "@/common/timeUtil";

function _isDigit(char:string):boolean { return char >= '0' && char <= '9'; }

function _isValidTimestampPart(part:string, requiredLength:number|null):boolean {
  if (!part.length) return false;
  if (requiredLength !== null && part.length !== requiredLength) return false;
  return Array.from(part).every(_isDigit);
}

export function isRelativeTimestamp(text:string):boolean {
  return text.trim() === ':';
}

export function tryParseAbsoluteTimestamp(text:string):number|null {
  const parts = text.trim().split(':');
  if (parts.length !== 2 && parts.length !== 3) return null;
  const [hoursText, minutesText, secondsText] = parts;
  if (!_isValidTimestampPart(hoursText, null) || !_isValidTimestampPart(minutesText, 2)
      || (secondsText !== undefined && !_isValidTimestampPart(secondsText, 2))) {
    return null;
  }
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = secondsText === undefined ? 0 : Number(secondsText);
  if (minutes >= SECS_IN_MINUTE || seconds >= SECS_IN_MINUTE) return null;
  return (((hours * SECS_IN_MINUTE) + minutes) * SECS_IN_MINUTE + seconds) * MSECS_IN_SECOND;
}

export function beginsWithTimestamp(text:String):boolean {
  text = text.trim();
  const firstSpacePos = text.indexOf(' ');
  const endPos = firstSpacePos === -1 ? text.length : firstSpacePos;
  const candidate = text.substring(0, endPos);
  return isRelativeTimestamp(candidate) || tryParseAbsoluteTimestamp(candidate) !== null;
}
/* This module groups itinerary activity text normalization and parsing helpers used during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { parseLeadingTimestampOrThrowOnInvalid } from "@/levelLoading/timestampUtil";
import { MSECS_IN_DAY } from "@/common/timeUtil";
import { normalizeId } from "@/game/idUtil";

import { runWithItineraryLineContext } from "./itineraryLoadErrorUtil";
import LoadItinerariesOptions from "./types/LoadItinerariesOptions";
import ParsedItineraryActivity from "./types/ParsedItineraryActivity";

const _ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

function _isWhitespace(char:string):boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function _isAsciiPunctuation(char:string):boolean {
  return _ASCII_PUNCTUATION.includes(char);
}

function _normalizeWhitespaceAndPunctuationOutsideQuotes(text:string, preservedPunctuationChars:Set<string>):string {
  let normalizedText = '';
  let inQuotes = false;
  let pendingSpace = false;

  for (const char of text.trim()) {
    if (char === '"') {
      if (!inQuotes && pendingSpace && normalizedText) normalizedText += ' ';
      normalizedText += char;
      inQuotes = !inQuotes;
      pendingSpace = false;
      continue;
    }
    if (inQuotes) {
      normalizedText += char;
      continue;
    }
    if (_isWhitespace(char) || (_isAsciiPunctuation(char) && !preservedPunctuationChars.has(char))) {
      pendingSpace = normalizedText.length > 0;
      continue;
    }
    if (pendingSpace && normalizedText) normalizedText += ' ';
    normalizedText += char;
    pendingSpace = false;
  }

  return normalizedText.trim();
}

function _stripBoundaryPunctuation(text:string, preservedPunctuationChars:Set<string> = new Set()):string {
  let startIndex = 0;
  let endIndex = text.length;

  while (startIndex < endIndex && (_isWhitespace(text[startIndex]) || (_isAsciiPunctuation(text[startIndex]) && !preservedPunctuationChars.has(text[startIndex])))) startIndex += 1;
  while (endIndex > startIndex && (_isWhitespace(text[endIndex - 1]) || (_isAsciiPunctuation(text[endIndex - 1]) && !preservedPunctuationChars.has(text[endIndex - 1])))) endIndex -= 1;

  return text.slice(startIndex, endIndex).trim();
}

function _normalizeActivityArgument(text:string, preservedPunctuationChars:Set<string>):string {
  return _stripBoundaryPunctuation(_normalizeWhitespaceAndPunctuationOutsideQuotes(text, preservedPunctuationChars), preservedPunctuationChars);
}

function _normalizeSpeechActivityText(activityText:string, speechVerb:'says'|'interrupts'):string {
  const speechText = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityText.slice(speechVerb.length), new Set(['"', '\'', '-']));
  if (!speechText.length) return speechVerb;
  return `${speechVerb} ${speechText}`;
}

function _normalizeThoughtActivityText(activityText:string):string {
  const thoughtText = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityText.slice('thinks'.length), new Set(['"', '\'', '-']));
  if (!thoughtText.length) return 'thinks';
  return `thinks ${thoughtText}`;
}

function _normalizeFacingActivityText(activityText:string):string {
  const facingDirection = _normalizeActivityArgument(activityText.slice('faces'.length), new Set(['\'', '-'])).toLowerCase();
  return facingDirection ? `faces ${facingDirection}` : 'faces';
}

function _normalizeBodyOrientationActivityText(activityText:string, verb:'stands'|'sits'|'lays'):string {
  const normalizedText = _normalizeActivityArgument(activityText.slice(verb.length), new Set(['\'', '-']));
  return normalizedText ? `${verb} ${normalizedText}` : verb;
}

function _normalizeDieActivityText(activityText:string):string {
  const normalizedText = _normalizeActivityArgument(activityText.slice('dies'.length), new Set(['\'', '-']));
  return normalizedText ? `dies ${normalizedText}` : 'dies';
}

function _normalizeGiveActivityText(activityText:string):string {
  const giveText = activityText.slice('gives'.length).trim();
  const separatorIndex = giveText.lastIndexOf(' to ');
  if (separatorIndex <= 0 || separatorIndex >= giveText.length - ' to '.length) return 'gives';

  const itemRef = _normalizeActivityArgument(giveText.slice(0, separatorIndex), new Set(['.', '\'', '-']));
  const recipientId = _normalizeActivityArgument(giveText.slice(separatorIndex + ' to '.length), new Set(['.', '\'', '-']));
  if (!itemRef || !recipientId) return 'gives';
  return `gives ${itemRef} to ${recipientId}`;
}

function _normalizeRoomTargetActivityText(activityText:string, verb:'locks'|'unlocks'):string {
  const roomRef = _normalizeActivityArgument(activityText.slice(verb.length), new Set(['.', '\'', '-']));
  return roomRef ? `${verb} ${roomRef}` : verb;
}

function _normalizeParsedActivityText(activityText:string):string {
  const trimmedActivityText = activityText.trim();

  if (trimmedActivityText.startsWith('@')) {
    const targetText = _normalizeActivityArgument(trimmedActivityText.slice(1), new Set(['.', '%', '\'', '-']));
    return targetText ? `@ ${targetText}` : '@';
  }
  if (trimmedActivityText.startsWith('says')) return _normalizeSpeechActivityText(trimmedActivityText, 'says');
  if (trimmedActivityText.startsWith('interrupts')) return _normalizeSpeechActivityText(trimmedActivityText, 'interrupts');
  if (trimmedActivityText.startsWith('thinks')) return _normalizeThoughtActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('faces')) return _normalizeFacingActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('dies')) return _normalizeDieActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('stands')) return _normalizeBodyOrientationActivityText(trimmedActivityText, 'stands');
  if (trimmedActivityText.startsWith('sits')) return _normalizeBodyOrientationActivityText(trimmedActivityText, 'sits');
  if (trimmedActivityText.startsWith('lays')) return _normalizeBodyOrientationActivityText(trimmedActivityText, 'lays');
  if (trimmedActivityText.startsWith('gives')) return _normalizeGiveActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('unlocks')) return _normalizeRoomTargetActivityText(trimmedActivityText, 'unlocks');
  if (trimmedActivityText.startsWith('locks')) return _normalizeRoomTargetActivityText(trimmedActivityText, 'locks');
  if (trimmedActivityText.startsWith('drops')) {
    const itemRef = _normalizeActivityArgument(trimmedActivityText.slice('drops'.length), new Set(['.', '\'', '-']));
    return itemRef ? `drops ${itemRef}` : 'drops';
  }
  if (trimmedActivityText.startsWith('takes')) {
    const itemRef = _normalizeActivityArgument(trimmedActivityText.slice('takes'.length), new Set(['.', '\'', '-']));
    return itemRef ? `takes ${itemRef}` : 'takes';
  }
  return trimmedActivityText;
}

function _parseCharacterActivityLine(activityLine:string):{ characterId:string, activityText:string } {
  const normalizedLine = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityLine, new Set(['@', '.', '%', '"', '\'', '-']));
  const activityMarkers = [' @', ' says ', ' interrupts ', ' thinks ', ' faces ', ' dies', ' stands', ' sits', ' lays', ' gives ', ' drops ', ' takes ', ' locks ', ' unlocks '];
  let splitIndex = -1;

  activityMarkers.forEach(marker => {
    const markerIndex = normalizedLine.indexOf(marker);
    if (markerIndex <= 0) return;
    if (splitIndex === -1 || markerIndex < splitIndex) splitIndex = markerIndex;
  });

  if (splitIndex === -1) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  const characterText = _stripBoundaryPunctuation(normalizedLine.slice(0, splitIndex));
  const activityText = _normalizeParsedActivityText(normalizedLine.slice(splitIndex + 1));
  if (!characterText || !activityText) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  return { characterId:normalizeId(characterText), activityText };
}

function _resolveAbsoluteTimestamp(rawMsecs:number|null, options:LoadItinerariesOptions, startTime:number):number|null {
  if (rawMsecs === null) return null;
  if (options.isCrossMidnight && rawMsecs < startTime) return rawMsecs + MSECS_IN_DAY;
  return rawMsecs;
}

export function parseItineraryActivities(itinerarySection:string, levelFilename:string, firstLineNo:number,
  options:LoadItinerariesOptions, startTime:number):ParsedItineraryActivity[] {
  return itinerarySection.split('\n').map((line, index) => ({ line, lineNo:firstLineNo + index }))
    .flatMap(({ line, lineNo }) => {
      return runWithItineraryLineContext(levelFilename, lineNo, () => {
        const timestamp = parseLeadingTimestampOrThrowOnInvalid(line);
        if (!timestamp) return [];
        const activityLine = timestamp.remainingText.trim();
        if (!activityLine.length) throw new Error('missing itinerary activity');
        const { characterId, activityText } = _parseCharacterActivityLine(activityLine);
        const resolvedTimestamp = timestamp.kind === 'absolute'
          ? _resolveAbsoluteTimestamp(timestamp.time, options, startTime)
          : timestamp.time;
        return [{
          sourceIndex:-1,
          time:resolvedTimestamp,
          resolvedTime:resolvedTimestamp ?? 0,
          isTimeResolved:timestamp.kind === 'absolute',
          timestampType:timestamp.kind,
          lineNo,
          characterId,
          activityText
        }];
      });
    })
    .map((activity, sourceIndex) => ({ ...activity, sourceIndex }));
}
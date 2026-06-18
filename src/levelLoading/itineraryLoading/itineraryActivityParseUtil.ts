/* This module groups itinerary activity text normalization and parsing helpers used during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { parseLeadingTimestampOrThrowOnInvalid } from "@/levelLoading/timestampUtil";
import { MSECS_IN_DAY } from "@/common/timeUtil";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
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

function _normalizeEmitActivityText(activityText:string):string {
  const emitText = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityText.slice('emits'.length), new Set(['"', '\'', '-', '(', ')']));
  if (!emitText.length) return 'emits';
  return `emits ${emitText}`;
}

function _normalizeFacingActivityText(activityText:string):string {
  const facingDirection = _normalizeActivityArgument(activityText.slice('faces'.length), new Set(['\'', '-'])).toLowerCase();
  return facingDirection ? `faces ${facingDirection}` : 'faces';
}

function _normalizeBodyOrientationActivityText(activityText:string, verb:'stands'|'sits'|'kneels'|'lays'):string {
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

function _normalizeDropActivityText(activityText:string):string {
  const itemRef = _normalizeActivityArgument(activityText.slice('drops'.length), new Set(['(', ')', '.', '\'', '-']));
  return itemRef ? `drops ${itemRef}` : 'drops';
}

function _normalizeWaitActivityText(activityText:string):string {
  const waitDurationText = _normalizeActivityArgument(activityText.slice('waits'.length), new Set(['.']));
  return waitDurationText ? `waits ${waitDurationText}` : 'waits';
}

function _normalizeRoomTargetActivityText(activityText:string, verb:'locks'|'unlocks'):string {
  const roomRef = _normalizeActivityArgument(activityText.slice(verb.length), new Set(['.', '\'', '-']));
  return roomRef ? `${verb} ${roomRef}` : verb;
}

function _normalizeVisibilityTargetActivityText(activityText:string, verb:'show'|'hide'):string {
  const targetRef = _normalizeActivityArgument(activityText.slice(verb.length), new Set(['.', '\'', '-']));
  return targetRef ? `${verb} ${targetRef}` : verb;
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
  if (trimmedActivityText.startsWith('emits')) return _normalizeEmitActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('faces')) return _normalizeFacingActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('dies')) return _normalizeDieActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('stands')) return _normalizeBodyOrientationActivityText(trimmedActivityText, 'stands');
  if (trimmedActivityText.startsWith('sits')) return _normalizeBodyOrientationActivityText(trimmedActivityText, 'sits');
  if (trimmedActivityText.startsWith('kneels')) return _normalizeBodyOrientationActivityText(trimmedActivityText, 'kneels');
  if (trimmedActivityText.startsWith('lays')) return _normalizeBodyOrientationActivityText(trimmedActivityText, 'lays');
  if (trimmedActivityText.startsWith('gives')) return _normalizeGiveActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('unlocks')) return _normalizeRoomTargetActivityText(trimmedActivityText, 'unlocks');
  if (trimmedActivityText.startsWith('locks')) return _normalizeRoomTargetActivityText(trimmedActivityText, 'locks');
  if (trimmedActivityText.startsWith('show')) return _normalizeVisibilityTargetActivityText(trimmedActivityText, 'show');
  if (trimmedActivityText.startsWith('hide')) return _normalizeVisibilityTargetActivityText(trimmedActivityText, 'hide');
  if (trimmedActivityText.startsWith('drops')) return _normalizeDropActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('waits')) return _normalizeWaitActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('takes')) {
    const itemRef = _normalizeActivityArgument(trimmedActivityText.slice('takes'.length), new Set(['.', '\'', '-']));
    return itemRef ? `takes ${itemRef}` : 'takes';
  }
  return trimmedActivityText;
}

function _parseWaitDurationMsecs(activityText:string):number|null {
  if (!activityText.startsWith('waits')) return null;
  const trimmedWaitText = activityText.trim();
  if (trimmedWaitText === 'waits') return MSECS_IN_SECOND;
  const waitDurationText = trimmedWaitText.slice('waits'.length).trim();
  if (!waitDurationText.length) return MSECS_IN_SECOND;
  const parsedSeconds = Number(waitDurationText);
  if (!Number.isFinite(parsedSeconds) || parsedSeconds < 0) throw new Error(`invalid waits duration '${waitDurationText}'`);
  return parsedSeconds * MSECS_IN_SECOND;
}

function _parseActivityLine(activityLine:string, impliedCharacterId:string):{ characterId:string, subjectKind:'character'|'item', subjectId:string, activityText:string } {
  const normalizedLine = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityLine, new Set(['@', '(', ')', '.', '%', '"', '\'', '-']));
  if (['@', 'says ', 'interrupts ', 'thinks ', 'emits ', 'faces ', 'dies', 'stands', 'sits', 'kneels', 'lays', 'gives ', 'drops ', 'takes ', 'waits', 'locks ', 'unlocks ', 'show ', 'hide ']
    .some(marker => normalizedLine.startsWith(marker))) {
    const activityText = _normalizeParsedActivityText(normalizedLine);
    if (!impliedCharacterId || !activityText) throw new Error(`unable to infer character for itinerary activity line '${activityLine}'`);
    return { characterId:impliedCharacterId, subjectKind:'character', subjectId:impliedCharacterId, activityText };
  }
  const activityMarkers = [' @', ' says ', ' interrupts ', ' thinks ', ' emits ', ' faces ', ' dies', ' stands', ' sits', ' kneels', ' lays', ' gives ', ' drops ', ' takes ', ' waits', ' locks ', ' unlocks ', ' show ', ' hide '];
  let splitIndex = -1;

  activityMarkers.forEach(marker => {
    const markerIndex = normalizedLine.indexOf(marker);
    if (markerIndex <= 0) return;
    if (splitIndex === -1 || markerIndex < splitIndex) splitIndex = markerIndex;
  });

  if (splitIndex === -1) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  const subjectText = _stripBoundaryPunctuation(normalizedLine.slice(0, splitIndex));
  const activityText = _normalizeParsedActivityText(normalizedLine.slice(splitIndex + 1));
  if (!subjectText || !activityText) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  if (activityText.startsWith('emits')) return { characterId:impliedCharacterId, subjectKind:'item', subjectId:normalizeId(subjectText), activityText };
  const characterId = normalizeId(subjectText);
  return { characterId, subjectKind:'character', subjectId:characterId, activityText };
}

function _resolveAbsoluteTimestamp(rawMsecs:number|null, options:LoadItinerariesOptions, startTime:number):number|null {
  if (rawMsecs === null) return null;
  if (options.isCrossMidnight && rawMsecs < startTime) return rawMsecs + MSECS_IN_DAY;
  return rawMsecs;
}

export function parseItineraryActivities(itinerarySection:string, levelFilename:string, firstLineNo:number,
  options:LoadItinerariesOptions, startTime:number, activeCharacterId:string):ParsedItineraryActivity[] {
  let impliedCharacterId = activeCharacterId;
  return itinerarySection.split('\n').map((line, index) => ({ line, lineNo:firstLineNo + index }))
    .flatMap(({ line, lineNo }) => {
      return runWithItineraryLineContext(levelFilename, lineNo, () => {
        const timestamp = parseLeadingTimestampOrThrowOnInvalid(line);
        if (!timestamp) return [];
        const activityLine = timestamp.remainingText.trim();
        if (!activityLine.length) throw new Error('missing itinerary activity');
        const { characterId, subjectKind, subjectId, activityText } = _parseActivityLine(activityLine, impliedCharacterId);
        if (subjectKind === 'character') impliedCharacterId = characterId;
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
          subjectKind,
          subjectId,
          activityText,
          waitDurationMsecs:_parseWaitDurationMsecs(activityText)
        }];
      });
    })
    .map((activity, sourceIndex) => ({
      ...activity,
      sourceIndex,
      resolvedTime:activity.timestampType === 'after-previous-activity' && sourceIndex === 0 ? startTime : activity.resolvedTime,
      isTimeResolved:activity.timestampType === 'absolute' || sourceIndex === 0
    }));
}
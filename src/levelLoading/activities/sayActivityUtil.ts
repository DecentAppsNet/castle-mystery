/* This module groups speech-activity parsing and overlap validation during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { createFaceEvent, createSpeechEvent } from "@/game/itineraryUtil";
import Character from "@/game/types/Character";
import type { FacingDirection } from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import SpeechEvent from "@/game/types/itineraryEvents/SpeechEvent";
import { isActiveAudibleRoom } from "@/game/roomUtil";
import { formatMsecsAsTimestamp } from "@/levelLoading/timestampUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findCurrentRoom, findStatePoseAtTime } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findTargetPositionAtTime } from "./activity/activityTargetingUtil";
import { findSentenceStyleActivityVerb, parseSentenceStyleActivityText, stripTrailingPeriod } from "./activity/activityTextParseUtil";
import { normalizeId } from "@/game/idUtil";

type SpeechVerb = 'says' | 'interrupts';

type ParsedSpeechActivity = {
  speech:string;
  recipientId:string|null;
  recipientText:string|null;
};

function _parseSpeechActivityText(activityText:string, speechVerb:SpeechVerb):ParsedSpeechActivity {
  const contentText = activityText.trim().slice(speechVerb.length).trim();
  if (!contentText.length) throw new Error(`missing speech text in authored activity '${activityText}'`);
  if (!contentText.startsWith('"')) {
    return {
      speech:parseSentenceStyleActivityText(activityText, speechVerb, 'speech'),
      recipientId:null,
      recipientText:null
    };
  }

  const closingQuoteIndex = contentText.lastIndexOf('"');
  if (closingQuoteIndex <= 0) throw new Error(`unterminated speech text in authored activity '${activityText}'`);
  const trailingText = contentText.slice(closingQuoteIndex + 1).trim();
  if (!trailingText.length) {
    return {
      speech:contentText.slice(1, closingQuoteIndex),
      recipientId:null,
      recipientText:null
    };
  }
  if (!trailingText.startsWith('to ')) throw new Error(`invalid trailing speech text '${trailingText}' in authored activity '${activityText}'`);

  const recipientText = stripTrailingPeriod(trailingText.slice('to '.length).trim());
  if (!recipientText.length) throw new Error(`missing speech recipient in authored activity '${activityText}'`);
  return {
    speech:contentText.slice(1, closingQuoteIndex),
    recipientId:normalizeId(recipientText),
    recipientText
  };
}

function _findOverlappingSpeechEvent(events:ItineraryEvent[], speechEvent:SpeechEvent):SpeechEvent|null {
  return events.find(event =>
    event.type === ItineraryEventType.SPEECH
    && speechEvent.startTime < event.startTime + event.duration
    && event.startTime < speechEvent.startTime + speechEvent.duration) as SpeechEvent | undefined || null;
}

function _createOverlappingSpeechMessage(overlappingSpeechEvent:SpeechEvent, speechEvent:SpeechEvent, timestampType:ActivityContext['timestampType']):string {
  const overlappingSpeechEndTime = overlappingSpeechEvent.startTime + overlappingSpeechEvent.duration;
  const explanation = timestampType === 'absolute'
    ? `This usually means an absolute timestamp started a new speech before the previous one finished.`
    : `This speech would begin before the previous speech finished.`;
  return `same character speech overlap: '${speechEvent.speech}' starts at ${formatMsecsAsTimestamp(speechEvent.startTime)} before earlier speech '${overlappingSpeechEvent.speech}' ends at ${formatMsecsAsTimestamp(overlappingSpeechEndTime)}. ${explanation} Move the later speech later, or use ':' if it should wait for the previous activity.`;
}

function _findActiveSpeechEvent(events:ItineraryEvent[], time:number):SpeechEvent|null {
  return events.find(event =>
    event.type === ItineraryEventType.SPEECH
    && event.startTime <= time
    && time < event.startTime + event.duration) as SpeechEvent | undefined || null;
}

function _findCharacterRoomAtTime(context:ActivityContext, character:Character, time:number) {
  const state = context.characterStatesById.get(character.id);
  if (!state) return null;
  const pose = findStatePoseAtTime(character, state, time);
  return findCurrentRoom(context.level, pose.position);
}

function _findSpeechRecipientFacingDirection(context:ActivityContext, activityText:string,
  activityStartTime:number, recipientId:string, recipientText:string):FacingDirection {
  const recipient = context.charactersById.get(recipientId) || null;
  if (!recipient) throw new Error(`unknown speech recipient '${recipientText}' in authored activity '${activityText}'`);

  const targetPosition = findTargetPositionAtTime(recipientId, activityStartTime,
    context.charactersById, context.characterStatesById, context.roomItemsByRoomId, context.poseOverridesByCharacterId);
  if (!targetPosition) throw new Error(`unable to locate speech recipient '${recipientText}' in authored activity '${activityText}'`);

  const speakerPosition = findStatePoseAtTime(context.character, context.state, activityStartTime).position;
  return targetPosition.x < speakerPosition.x ? 'left' : 'right';
}

function _createAudibleSpeechOverlapMessage(otherCharacter:Character, otherSpeechEvent:SpeechEvent, speakerRoomTitle:string, speechEvent:SpeechEvent):string {
  const otherSpeechEndTime = otherSpeechEvent.startTime + otherSpeechEvent.duration;
  return `audible speech overlap: '${speechEvent.speech}' starts at ${formatMsecsAsTimestamp(speechEvent.startTime)} while ${otherCharacter.title} is already speaking '${otherSpeechEvent.speech}' until ${formatMsecsAsTimestamp(otherSpeechEndTime)} in a room audible from ${speakerRoomTitle}. Use 'interrupts' instead of 'says' if talking over another audible character is intentional.`;
}

function _throwOnAudibleSpeechOverlap(context:ActivityContext, speechEvent:SpeechEvent) {
  const speakerRoom = _findCharacterRoomAtTime(context, context.character, speechEvent.startTime);
  if (!speakerRoom) return;

  for (const [characterId, otherCharacter] of context.charactersById.entries()) {
    if (characterId === context.character.id) continue;
    const otherState = context.characterStatesById.get(characterId);
    if (!otherState) continue;
    const otherSpeechEvent = _findActiveSpeechEvent(otherState.events, speechEvent.startTime);
    if (!otherSpeechEvent) continue;
    const otherRoom = _findCharacterRoomAtTime(context, otherCharacter, speechEvent.startTime);
    if (!otherRoom || !isActiveAudibleRoom(otherRoom, speakerRoom)) continue;
    throw new Error(_createAudibleSpeechOverlapMessage(otherCharacter, otherSpeechEvent, speakerRoom.title, speechEvent));
  }
}

function _findSpeechVerb(activityText:string):SpeechVerb|null {
  return findSentenceStyleActivityVerb(activityText, ['says', 'interrupts']);
}

export function tryCreateSayActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const speechVerb = _findSpeechVerb(activityText);
  if (!speechVerb) return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const { speech, recipientId, recipientText } = _parseSpeechActivityText(activityText.trim(), speechVerb);
  const speechEvent = createSpeechEvent(activityStartTime, speech);
  const overlappingSpeechEvent = _findOverlappingSpeechEvent(context.state.events, speechEvent);
  if (overlappingSpeechEvent) throw new Error(_createOverlappingSpeechMessage(overlappingSpeechEvent, speechEvent, context.timestampType));
  if (speechVerb === 'says') _throwOnAudibleSpeechOverlap(context, speechEvent);

  if (!recipientId || !recipientText) return [speechEvent];
  return [createFaceEvent(activityStartTime, _findSpeechRecipientFacingDirection(context, activityText, activityStartTime, recipientId, recipientText)), speechEvent];
}

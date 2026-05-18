import { createSpeechEvent } from "@/game/itineraryUtil";
import Character from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import SpeechEvent from "@/game/types/itineraryEvents/SpeechEvent";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findCurrentRoom, findStatePoseAtTime } from "./activityUtil";
import { isActiveAudibleRoom } from "@/game/roomUtil";
import { formatMsecsAsTimestamp } from "@/common/timestampUtil";

type SpeechVerb = 'says' | 'interrupts';

function _parseSpeechText(activityText:string, speechVerb:SpeechVerb):string {
  const speechText = activityText.slice(speechVerb.length).trim();
  if (!speechText.length) throw new Error(`missing speech text in authored activity '${activityText}'`);
  if (speechText.startsWith('"')) {
    const closingQuoteIndex = speechText.lastIndexOf('"');
    if (closingQuoteIndex <= 0) throw new Error(`unterminated speech text in authored activity '${activityText}'`);
    return speechText.slice(1, closingQuoteIndex);
  }
  return speechText;
}

function _findOverlappingSpeechEvent(events:ItineraryEvent[], speechEvent:SpeechEvent):SpeechEvent|null {
  return events.find(event =>
    event.type === ItineraryEventType.SPEECH
    && speechEvent.startTime < event.startTime + event.duration
    && event.startTime < speechEvent.startTime + speechEvent.duration) as SpeechEvent | undefined || null;
}

function _createOverlappingSpeechMessage(overlappingSpeechEvent:SpeechEvent, speechEvent:SpeechEvent, timestampKind:ActivityContext['timestampKind']):string {
  const overlappingSpeechEndTime = overlappingSpeechEvent.startTime + overlappingSpeechEvent.duration;
  const explanation = timestampKind === 'absolute'
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
  const trimmedActivityText = activityText.trim();
  if (trimmedActivityText.startsWith('says ')) return 'says';
  if (trimmedActivityText.startsWith('interrupts ')) return 'interrupts';
  return null;
}

export function tryCreateSayActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const speechVerb = _findSpeechVerb(activityText);
  if (!speechVerb) return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const speechEvent = createSpeechEvent(activityStartTime, _parseSpeechText(activityText.trim(), speechVerb));
  const overlappingSpeechEvent = _findOverlappingSpeechEvent(context.state.events, speechEvent);
  if (overlappingSpeechEvent) throw new Error(_createOverlappingSpeechMessage(overlappingSpeechEvent, speechEvent, context.timestampKind));
  if (speechVerb === 'says') _throwOnAudibleSpeechOverlap(context, speechEvent);
  return [speechEvent];
}

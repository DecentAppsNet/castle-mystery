import { assert, assertNonNullable } from "decent-portal";

import { clamp } from "@/common/numberUtil";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import SpeechEffect from "@/game/effects/types/SpeechEffect";
import Room from "@/game/types/Room";
import { formatMsecsAsTimestamp } from "@/levelLoading/activityLoading";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findCharacterKeyframeInRange, findKeyframeInRange, findCharacterPositionAtTime, findKeyframeForTime } from "@/game/timeline";
import { findRoomAtPosition } from "@/game/roomUtil";
import Effect from "@/game/effects/types/Effect";
import Position from "@/game/types/Position";

const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;

function _findRoomsInEarshot(keyframes:TimelineKeyframe[], characterI:number, rooms:Room[], speechStartTime:number):Room[] {
  const position = findCharacterPositionAtTime(keyframes, characterI, speechStartTime);
  const characterRoom = findRoomAtPosition(rooms, position.x, position.y);
  assertNonNullable(characterRoom);

  const earshotRooms:Room[] = [characterRoom];
  characterRoom.exits.forEach(exit => {
    if (exit.exitStatus === 'open') {
      const otherRoomId = exit.room1Id === characterRoom.id ? exit.room2Id : exit.room1Id;
      const otherRoom = rooms.find(r => r.id === otherRoomId);
      assertNonNullable(otherRoom);
      earshotRooms.push(otherRoom);
    }
  });
  return earshotRooms;
}

function _findSelfInterruption(keyframes:TimelineKeyframe[], characterI:number, speechStartTime:number, speechEndTime:number):string|null {
  const keyframe:CharacterKeyframe|null = findCharacterKeyframeInRange(keyframes, characterI, speechStartTime, speechEndTime, 
    (ckf:CharacterKeyframe) => ckf.effects.find(e => e.kind === 'speech') !== undefined);
  if (!keyframe) return null;
  
  const speechEffect:SpeechEffect = keyframe.effects.find(e => e.kind === 'speech') as SpeechEffect;
  assertNonNullable(speechEffect);
  return `Character's speech will be interrupted by self with "${speechEffect.text}" at ${formatMsecsAsTimestamp(speechEffect.startTime)}.`; 
}

function _findCharacterSayingText(effects:Effect[], startTime:number):string|null {
  const sayingEffect = effects.find(e => e.kind === 'speech' && e.endTime > startTime && (e as SpeechEffect).speechKind === 'says');
  return sayingEffect === undefined ? null : (sayingEffect as SpeechEffect).text;
}

function _isCharacterInEarshot(earshotRooms:Room[], characterPosition:Position):boolean {
  return findRoomAtPosition(earshotRooms, characterPosition.x, characterPosition.y) !== null;
}

function _findCharacterSpeechInterrupted(earshotRooms:Room[], keyframes:TimelineKeyframe[], speechStartTime:number):string|null {
  const keyframe = findKeyframeForTime(keyframes, speechStartTime);
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    const characterKeyframe = keyframe.characters[characterI];
    const sayingText = _findCharacterSayingText(characterKeyframe.effects, speechStartTime);
    if (sayingText && _isCharacterInEarshot(earshotRooms, characterKeyframe.position)) {
      return `Character can't start speaking at ${formatMsecsAsTimestamp(speechStartTime)} because they will be interrupted by "${sayingText}".`; 
    }
  }
  return null;
}

function _findCharacterSpeechInterrupting(earshotRooms:Room[], keyframes:TimelineKeyframe[], 
    speechStartTime:number, speechEndTime:number):string|null {
  let errorMessage = '';
  const characterCount = keyframes[0].characters.length;
  const keyframe = findKeyframeInRange(keyframes, speechStartTime, speechEndTime, (keyframe:TimelineKeyframe) => {
    for(let characterI = 0; characterI < characterCount; ++characterI) {
      const characterKeyframe = keyframe.characters[characterI];
      assertNonNullable(characterKeyframe);
      const sayingText = _findCharacterSayingText(characterKeyframe.effects, speechStartTime);
      // Note that the earshot check is needed for each character/keyframe because position can change.
      if (!sayingText || !_isCharacterInEarshot(earshotRooms, characterKeyframe.position)) continue;
      const startTimestamp = formatMsecsAsTimestamp(speechStartTime);
      errorMessage = `Character can't start speeaking at ${startTimestamp} because they will interrupt "${sayingText}".`;
      return true;
    }
    return false;
  });
  return !keyframe ? null : errorMessage;
}

export function calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

export function findSpeechConflict(speechKind:'says'|'interrupts'|'thinks'|'emits', rooms:Room[], 
    keyframes:TimelineKeyframe[], characterI:number, speechStartTime:number, speechEndTime:number):string|null {
  
  // Don't allow a character to interrupt themself. Even if there are a few cases where an author might want 
  // to do it, they are rare, and the clutter of bubbles around one character is difficult for a player to read.
  const selfInterruptErrorMessage = _findSelfInterruption(keyframes, characterI, speechStartTime, speechEndTime);
  if (selfInterruptErrorMessage) return selfInterruptErrorMessage;
  
  if (speechKind === 'emits' ||  // Often an author's intent to have a sound effect/noise heard while other speech is happening.
      speechKind === 'thinks') { // Likewise, an author may often intend a thought to be an immediate reaction to something said.
    return null;
  }

  const earshotRooms = _findRoomsInEarshot(keyframes, characterI, rooms, speechStartTime);
  if (speechKind === 'interrupts') { 
    // This character has author's permission to interrupt, but still need to check for another character interrupting.
    return _findCharacterSpeechInterrupted(earshotRooms, keyframes, speechStartTime);
  }

  // For "says", check for interruption because generally an author doesn't want characters speaking over each other,
  // especially for two separate conversations happening at same time due to an authoring mistake.
  assert(speechKind === 'says');
  return _findCharacterSpeechInterrupting(earshotRooms, keyframes, speechStartTime, speechEndTime);
}
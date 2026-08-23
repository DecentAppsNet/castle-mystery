import { clamp } from "@/common/numberUtil";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import SpeechCue from "@/game/types/effectCues/SpeechCue";
import Room from "@/game/types/Room";
import { formatMsecsAsTimestamp } from "../../timestampUtil";
import { assert, assertNonNullable } from "decent-portal";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findCharacterKeyframeInRange, findKeyframeInRange, findCharacterPositionAtTime, findKeyframeForTime } from "@/game/timeline";
import { findRoomAtPosition } from "@/game/roomUtil";
import EffectCue from "@/game/types/effectCues/EffectCue";
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
  // TODO - see scratch.md. This code assumes keyframes at cue start/stop boundaries. Current code only guarantees them at start boundary.
  
  const keyframe:CharacterKeyframe|null = findCharacterKeyframeInRange(keyframes, characterI, speechStartTime, speechEndTime, 
    (ckf:CharacterKeyframe) => ckf.effectCues.find(ec => ec.kind === 'speech') !== undefined);
  if (!keyframe) return null;
  
  const speechCue:SpeechCue = keyframe.effectCues.find(ec => ec.kind === 'speech') as SpeechCue;
  assertNonNullable(speechCue);
  return `Character's speech will be interrupted by self with "${speechCue.text}" at ${formatMsecsAsTimestamp(speechCue.startTime)}.`; 
}

function _findCharacterSayingText(effectCues:EffectCue[], startTime:number):string|null {
  const sayingCue = effectCues.find(ec => {
    return ec.kind === 'speech' && ec.endTime > startTime && (ec as SpeechCue).speechKind === 'says'
  });
  return sayingCue === undefined ? null : (sayingCue as SpeechCue).text;
}

function _isCharacterInEarshot(earshotRooms:Room[], characterPosition:Position):boolean {
  return findRoomAtPosition(earshotRooms, characterPosition.x, characterPosition.y) !== null;
}

function _findCharacterSpeechInterrupted(earshotRooms:Room[], keyframes:TimelineKeyframe[], speechStartTime:number):string|null {
  const keyframe = findKeyframeForTime(keyframes, speechStartTime);
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    const characterKeyframe = keyframe.characters[characterI];
    const sayingText = _findCharacterSayingText(characterKeyframe.effectCues, speechStartTime);
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
      const sayingText = _findCharacterSayingText(characterKeyframe.effectCues, speechStartTime);
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
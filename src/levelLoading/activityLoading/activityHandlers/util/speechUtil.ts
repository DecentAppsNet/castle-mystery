/* This file calculates speech timing and detects incompatible overlapping speech effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { clamp } from "@/common/numberUtil";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import Room from "@/game/types/Room";
import { formatMsecsAsTimestamp } from "@/levelLoading/activityLoading";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findCharacterKeyframeInRange, findKeyframeInRange, findCharacterPositionAtTime, findKeyframeForTime } from "@/game/timeline";
import { findRoomAtPosition } from "@/game/roomUtil";
import Effect from "@/game/effects/types/Effect";
import Position from "@/game/types/Position";

const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;

function _isSpeechEffect(effect:Effect) {
  return effect.kind === 'says' || effect.kind === 'thinks' || effect.kind === 'emits';
}

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
    (ckf:CharacterKeyframe) => ckf.effects.find(e => e.kind === 'says' || e.kind === 'thinks' || e.kind === 'emits') !== undefined);
  if (!keyframe) return null;
  
  const speechEffect = keyframe.effects.find(_isSpeechEffect);
  assertNonNullable(speechEffect);
  return `Character's speech will be interrupted by self at ${formatMsecsAsTimestamp(speechEffect.startTime)}.`; 
}

function _isCharacterSayingAtTime(effects:Effect[], startTime:number):boolean {
  return effects.find(e => e.endTime > startTime && e.kind === 'says') !== undefined;
}

function _isCharacterInEarshot(earshotRooms:Room[], characterPosition:Position):boolean {
  return findRoomAtPosition(earshotRooms, characterPosition.x, characterPosition.y) !== null;
}

function _findCharacterSpeechInterrupted(earshotRooms:Room[], keyframes:TimelineKeyframe[], speechStartTime:number):string|null {
  const keyframe = findKeyframeForTime(keyframes, speechStartTime);
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    const characterKeyframe = keyframe.characters[characterI];
    if (_isCharacterSayingAtTime(characterKeyframe.effects, speechStartTime) && _isCharacterInEarshot(earshotRooms, characterKeyframe.position)) {
      return `Character can't start speaking at ${formatMsecsAsTimestamp(speechStartTime)} because they will be interrupted.`; 
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
      // Note that the earshot check is needed for each character/keyframe because position can change.
      if (!_isCharacterSayingAtTime(characterKeyframe.effects, speechStartTime) || !_isCharacterInEarshot(earshotRooms, characterKeyframe.position)) continue;
      const startTimestamp = formatMsecsAsTimestamp(speechStartTime);
      errorMessage = `Character can't start speaking at ${startTimestamp} because they will interrupt.`;
      return true;
    }
    return false;
  });
  return !keyframe ? null : errorMessage;
}

/** Estimates speech duration from text length with a minimum duration. */
export function calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

/** Returns an author-facing conflict for incompatible overlapping speech, or null. */
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
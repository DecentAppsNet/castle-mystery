/* This file calculates speech timing and detects incompatible overlapping speech effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { clamp } from "@/common/numberUtil";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import Room from "@/game/types/Room";
import { formatMsecsAsTimestamp } from "@/levelLoading/activityLoading";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findKeyframeInRange, findCharacterPositionAtTime, findKeyframeForTime } from "@/game/timeline";
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

function _isCharacterSayingAtTime(effects:Effect[], startTime:number):boolean {
  return effects.find(e => e.endTime > startTime && e.kind === 'says') !== undefined;
}

function _isCharacterInEarshot(earshotRooms:Room[], characterPosition:Position):boolean {
  return findRoomAtPosition(earshotRooms, characterPosition.x, characterPosition.y) !== null;
}

function _isOtherCharacterSayingInEarshot(keyframe:TimelineKeyframe, currentCharacterI:number,
    earshotRooms:Room[], speechStartTime:number):boolean {
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    if (characterI === currentCharacterI) continue;
    const characterKeyframe = keyframe.characters[characterI];
    if (_isCharacterSayingAtTime(characterKeyframe.effects, speechStartTime)
        && _isCharacterInEarshot(earshotRooms, characterKeyframe.position)) return true;
  }
  return false;
}

function _findCharacterSpeechInterrupting(earshotRooms:Room[], keyframes:TimelineKeyframe[], 
  currentCharacterI:number, speechStartTime:number, speechEndTime:number):string|null {
  const startTimestamp = formatMsecsAsTimestamp(speechStartTime);
  const errorMessage = `Character can't start speaking at ${startTimestamp} because they will interrupt.`;

  // Detect speech already active when this speech starts, even if no later keyframe occurs in its interval.
  const startKeyframe = findKeyframeForTime(keyframes, speechStartTime);
  if (_isOtherCharacterSayingInEarshot(startKeyframe, currentCharacterI, earshotRooms, speechStartTime)) return errorMessage;

  // Detect another character whose speech starts later in this speech interval.
  const keyframe = findKeyframeInRange(keyframes, speechStartTime, speechEndTime, (keyframe:TimelineKeyframe) => {
    // The earshot check is needed for each keyframe because character positions can change.
    return _isOtherCharacterSayingInEarshot(keyframe, currentCharacterI, earshotRooms, speechStartTime);
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

  if (speechKind === 'interrupts' || // The author explicitly permits this character to start over another speaker.
      speechKind === 'emits' ||  // Often an author's intent to have a sound effect/noise heard while other speech is happening.
      speechKind === 'thinks') { // Likewise, an author may often intend a thought to be an immediate reaction to something said.
    return null;
  }

  const earshotRooms = _findRoomsInEarshot(keyframes, characterI, rooms, speechStartTime);
  // For "says", check for interruption because generally an author doesn't want characters speaking over each other,
  // especially for two separate conversations happening at same time due to an authoring mistake.
  assert(speechKind === 'says');
  return _findCharacterSpeechInterrupting(earshotRooms, keyframes, characterI, speechStartTime, speechEndTime);
}
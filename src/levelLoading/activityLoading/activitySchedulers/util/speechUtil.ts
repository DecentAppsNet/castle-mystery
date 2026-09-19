/* This file calculates speech timing and detects incompatible overlapping speech effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { clamp } from "@/common/numberUtil";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import Room from "@/game/types/Room";
import { formatMsecsAsTimestamp } from "@/levelLoading/activityLoading";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findKeyframeInRange, findKeyframeForTime, createKeyframeAtTime } from "@/game/timeline";
import { findRoomAtPosition, findRoomIAtPosition } from "@/game/roomUtil";
import Effect from "@/game/effects/types/Effect";
import Position from "@/game/types/Position";

const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;


type SpeechConflict = {
  characterId:string,
  verb:'says'|'thinks'|'emits',
  startTime:number,
  endTime:number
}

function _findRoomsInEarshotAtKeyframe(keyframe:TimelineKeyframe, characterI:number, rooms:Room[]):Room[] {
  assert(keyframe.rooms.length === rooms.length);
  
  const position = keyframe.characters[characterI].position;
  const characterRoomI = findRoomIAtPosition(rooms, position.x, position.y);
  const characterRoomExits = keyframe.rooms[characterRoomI].exits;
  const characterRoom = rooms[characterRoomI];
  assertNonNullable(characterRoom);
  assertNonNullable(characterRoomExits);

  const earshotRooms:Room[] = [characterRoom];
  characterRoomExits.forEach(exit => {
    if (exit.exitStatus === 'open') {
      const otherRoomId = exit.room1Id === characterRoom.id ? exit.room2Id : exit.room1Id;
      const otherRoom = rooms.find(r => r.id === otherRoomId);
      assertNonNullable(otherRoom);
      earshotRooms.push(otherRoom);
    }
  });
  return earshotRooms;
}

function _findRoomsInEarshot(keyframes:TimelineKeyframe[], characterI:number, rooms:Room[], speechStartTime:number):Room[] {
  const keyframe = createKeyframeAtTime(keyframes, speechStartTime);
  return _findRoomsInEarshotAtKeyframe(keyframe, characterI, rooms);
}

function _findCharacterSayingEffectAtTime(effects:Effect[], startTime:number):Effect|null {
  return effects.find(e => e.endTime > startTime && e.kind === 'says') ?? null;
}

function _findCharacterSayingOrThinkingEffectAtTime(effects:Effect[], startTime:number):Effect|null {
  return effects.find(e => e.endTime > startTime && (e.kind === 'says' || e.kind === 'thinks')) ?? null;
}

function _isCharacterInEarshot(earshotRooms:Room[], characterPosition:Position):boolean {
  return findRoomAtPosition(earshotRooms, characterPosition.x, characterPosition.y) !== null;
}

function _findOtherCharacterSayingInEarshot(keyframe:TimelineKeyframe, characterIds:string[], currentCharacterI:number,
    earshotRooms:Room[], speechStartTime:number):SpeechConflict|null {
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    if (characterI === currentCharacterI) continue;
    const characterKeyframe = keyframe.characters[characterI];
    const sayingEffect = _findCharacterSayingEffectAtTime(characterKeyframe.effects, speechStartTime);
    if (sayingEffect && _isCharacterInEarshot(earshotRooms, characterKeyframe.position)) {
      return {
        characterId:characterIds[characterI],
        verb:'says',
        startTime:sayingEffect.startTime,
        endTime:sayingEffect.endTime
      };
    }
  }
  return null;
}

function _findCharacterSpeechInterrupting(earshotRooms:Room[], keyframes:TimelineKeyframe[], characterIds:string[], 
  currentCharacterI:number, speechStartTime:number, speechEndTime:number):string|null {

  // Detect speech already active when this speech starts, even if no later keyframe occurs in its interval.
  const startKeyframe = findKeyframeForTime(keyframes, speechStartTime);
  let conflict = _findOtherCharacterSayingInEarshot(startKeyframe, characterIds, currentCharacterI, earshotRooms, speechStartTime);
  if (conflict) {
    return `${characterIds[currentCharacterI]} can't start speaking at ${formatMsecsAsTimestamp(speechStartTime)} `  + 
      `without interrupting ${conflict.characterId} who is already speaking from ${formatMsecsAsTimestamp(conflict.startTime)} to ` +
      `${formatMsecsAsTimestamp(conflict.endTime)}. Change timings or use "interrupts" instead of "says".`;
  }

  // Detect another character whose speech starts later in this speech interval.
  {
    let secondConflict:SpeechConflict|null = null;
    const keyframe = findKeyframeInRange(keyframes, speechStartTime, speechEndTime, (keyframe:TimelineKeyframe) => {
      // The earshot check is needed for each keyframe because character positions can change.
      secondConflict = _findOtherCharacterSayingInEarshot(keyframe, characterIds, currentCharacterI, earshotRooms, speechStartTime);
      return (secondConflict !== null);
    });
    if (!keyframe) return null;
    conflict = (secondConflict as unknown as SpeechConflict); // Typescript is not smart enough to trace execution through callback above, so scream at Typescript very loudly about which type we have.
  }

  // TODO - I'm doubting the logic in this function to cover the case of `A says` followed by `B interrupts`. I believe the activity for A
  // will always fail even if B has interrupts. You'll need a test that mixes relative and absolute timings in a way that allows B to be the first
  // activity to scheduled despite being chronologically later. If that test fails, consider if the second conflict check is even necessary.
  return `${characterIds[currentCharacterI]} can't start speaking at ${formatMsecsAsTimestamp(speechStartTime)} `  + 
      `without being interrupted by ${conflict.characterId} who is already speaking from ${formatMsecsAsTimestamp(conflict.startTime)} to ` +
      `${formatMsecsAsTimestamp(conflict.endTime)}. Change timings or use "interrupts" for ${conflict.characterId} instead of "says".`;
}

/** Estimates speech duration from text length with a minimum duration. */
export function calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

/** Returns an author-facing conflict for incompatible overlapping speech, or null. */
export function findSpeechConflict(speechKind:'says'|'interrupts'|'thinks'|'emits', rooms:Room[], 
    keyframes:TimelineKeyframe[], characterIds:string[], characterI:number, speechStartTime:number, speechEndTime:number):string|null {

  if (speechKind === 'interrupts' || // The author explicitly permits this character to start over another speaker.
      speechKind === 'emits' ||  // Often an author's intent to have a sound effect/noise heard while other speech is happening.
      speechKind === 'thinks') { // Likewise, an author may often intend a thought to be an immediate reaction to something said.
    return null;
  }

  const earshotRooms = _findRoomsInEarshot(keyframes, characterI, rooms, speechStartTime);
  // For "says", check for interruption because generally an author doesn't want characters speaking over each other,
  // especially for two separate conversations happening at same time due to an authoring mistake.
  assert(speechKind === 'says');
  return _findCharacterSpeechInterrupting(earshotRooms, keyframes, characterIds, characterI, speechStartTime, speechEndTime);
}

export function doesKeyframeHaveSpeechHeardByCharacter(keyframe:TimelineKeyframe, characterIds:string[], characterI:number, rooms:Room[]):boolean {
  if (!_findCharacterSayingOrThinkingEffectAtTime(keyframe.characters[characterI].effects, keyframe.time)) return true;
  const earshotRooms = _findRoomsInEarshotAtKeyframe(keyframe, characterI, rooms);
  return _findOtherCharacterSayingInEarshot(keyframe, characterIds, characterI, earshotRooms, keyframe.time) !== null;
} 
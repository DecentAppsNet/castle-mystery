/* This file determines speech and thought observation from fully populated timeline keyframes.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Room from "@/game/types/Room";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findRoomAtPosition, findRoomIAtPosition } from "@/game/roomUtil";
import Effect from "@/game/effects/types/Effect";
import Position from "@/game/types/Position";

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

function _findCharacterSayingEffectAtTime(effects:Effect[], startTime:number):Effect|null {
  return effects.find(e => e.endTime > startTime && e.kind === 'says') ?? null;
}

function _findCharacterSayingOrThinkingEffectAtTime(effects:Effect[], startTime:number):Effect|null {
  return effects.find(e => e.endTime > startTime && (e.kind === 'says' || e.kind === 'thinks')) ?? null;
}

function _isCharacterInEarshot(earshotRooms:Room[], characterPosition:Position):boolean {
  return findRoomAtPosition(earshotRooms, characterPosition.x, characterPosition.y) !== null;
}

function _doesOtherCharacterSayInEarshot(keyframe:TimelineKeyframe, currentCharacterI:number,
    earshotRooms:Room[], speechStartTime:number):boolean {
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    if (characterI === currentCharacterI) continue;
    const characterKeyframe = keyframe.characters[characterI];
    const sayingEffect = _findCharacterSayingEffectAtTime(characterKeyframe.effects, speechStartTime);
    if (sayingEffect && _isCharacterInEarshot(earshotRooms, characterKeyframe.position)) {
      return true;
    }
  }
  return false;
}

export function doesKeyframeHaveSpeechObservedByCharacter(keyframe:TimelineKeyframe, characterI:number, rooms:Room[]):boolean {
  if (_findCharacterSayingOrThinkingEffectAtTime(keyframe.characters[characterI].effects, keyframe.time)) return true;
  const earshotRooms = _findRoomsInEarshotAtKeyframe(keyframe, characterI, rooms);
  return _doesOtherCharacterSayInEarshot(keyframe, characterI, earshotRooms, keyframe.time);
}

function _findObservedSpeechEffects(keyframe:TimelineKeyframe, observingCharacterI:number, rooms:Room[]):Effect[] {
  const earshotRooms = _findRoomsInEarshotAtKeyframe(keyframe, observingCharacterI, rooms);
  return keyframe.characters.flatMap((character, characterI) => {
    const isObserver = characterI === observingCharacterI;
    if (!isObserver && !_isCharacterInEarshot(earshotRooms, character.position)) return [];
    return character.effects.filter(effect => effect.endTime > keyframe.time &&
      (effect.kind === 'says' || (isObserver && effect.kind === 'thinks')));
  });
}

export function doKeyframesHaveSameObservedSpeech(keyframeA:TimelineKeyframe, keyframeB:TimelineKeyframe, observingCharacterI:number, rooms:Room[]):boolean {
  const effectsA = _findObservedSpeechEffects(keyframeA, observingCharacterI, rooms);
  const effectsB = _findObservedSpeechEffects(keyframeB, observingCharacterI, rooms);
  return effectsA.length === effectsB.length && effectsA.every((effect, effectI) => effect.handler === effectsB[effectI].handler);
}
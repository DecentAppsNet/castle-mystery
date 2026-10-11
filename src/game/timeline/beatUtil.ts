/* This file finds key moments ("beats") that are used for rewinding/fast-forwarding in the game UI.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { findRoomAtPosition } from "../roomUtil";
import Room from "../types/Room";
import Timeline from "../types/Timeline";
import TimelineKeyframe from "../types/TimelineKeyframe";
import { createKeyframeAtTime, findFollowingKeyframe, findPrecedingKeyframe } from "./retrievalUtil";
import CharacterKeyframe, { areCharacterKeyframesEqual } from "../types/CharacterKeyframe";
import { areRoomKeyframesEqual } from "../types/RoomKeyframe";
import { doKeyframesHaveSameObservedSpeech } from "./speechObservationUtil";

function _findActiveCharacterRoomIdInKeyframe(baseRooms:Room[], keyframe:TimelineKeyframe, characterI:number):string {
  const position = keyframe.characters[characterI].position;
  const activeRoom = findRoomAtPosition(baseRooms, position.x, position.y);
  assertNonNullable(activeRoom);
  return activeRoom.id;
}

function _areCharacterIndicesEqual(a:number[], b:number[]):boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false; // Sequence of indexes should match, because they are generated from consistently ordered source.
  }
  return true;
}

function _findCharactersAtRoomInKeyframe(baseRooms:Room[], roomId:string, characterKeyframes:CharacterKeyframe[]):number[] {
  const characterIndices:number[] = [];
  characterKeyframes.forEach((ckf, characterI) => {
    const room = findRoomAtPosition(baseRooms, ckf.position.x, ckf.position.y);
    assertNonNullable(room);
    if (room.id === roomId) characterIndices.push(characterI);
  });
  return characterIndices;
}

function _areCharacterKeyframesCloseToSame(a:CharacterKeyframe, b:CharacterKeyframe):boolean {
  const bModified = { ...b, 
    // Any keys that shouldn't be considered for equality are overwritten to be equal.
    position:a.position, facingDirection:a.facingDirection, bodyOrientation:a.bodyOrientation 
  };
  return areCharacterKeyframesEqual(a, bModified);
}

function _collectStartingKeyframeInfo(baseRooms:Room[], timeline:Timeline, time:number, activeCharacterId:string):{startingKeyframe:TimelineKeyframe,
    activeCharacterI:number, startingRoomId:string, startingRoomI:number, startingCharacterIndices:number[]} {
  const activeCharacterI = timeline.characterIdToI[activeCharacterId];
  const startingKeyframe = createKeyframeAtTime(timeline.keyframes, Math.round(time));
  const startingRoomId = _findActiveCharacterRoomIdInKeyframe(baseRooms, startingKeyframe, activeCharacterI);
  const startingRoomI = timeline.roomIdToI[startingRoomId];
  const startingCharacterIndices = _findCharactersAtRoomInKeyframe(baseRooms, startingRoomId, startingKeyframe.characters);
  return { startingKeyframe, activeCharacterI, startingRoomI, startingRoomId, startingCharacterIndices };
}

function _isBeatKeyframe(baseRooms:Room[], activeCharacterI:number, startingKeyframe:TimelineKeyframe, startingRoomId:string, startingRoomI:number,
      startingCharacterIndices:number[], keyframe:TimelineKeyframe):boolean {
    if (keyframe === startingKeyframe) return false;
    const roomId = _findActiveCharacterRoomIdInKeyframe(baseRooms, keyframe, activeCharacterI);
    if (roomId !== startingRoomId) return true;
    const characterIndices = _findCharactersAtRoomInKeyframe(baseRooms, startingRoomId, keyframe.characters);
    if (!_areCharacterIndicesEqual(characterIndices, startingCharacterIndices)) return true;

    // Active character is in same room, and nobody has entered or left the room since starting keyframe. 
    
    // Look for any changes to the room.
    if (!areRoomKeyframesEqual(startingKeyframe.rooms[startingRoomI], keyframe.rooms[startingRoomI])) return true;

    // Look for any changes to character keyframes for starting occupants.
    for (let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
      if (!startingCharacterIndices.includes(characterI)) continue;
      if (!_areCharacterKeyframesCloseToSame(startingKeyframe.characters[characterI], keyframe.characters[characterI])) return true;
    }

    // Perform a larger check for changes to what speech the active character observes. This will catch
    // things like sounds audible from adjacent rooms.
    if (!doKeyframesHaveSameObservedSpeech(startingKeyframe, keyframe, activeCharacterI, baseRooms)) return true;

    return false;
  }

export function findNextTimelineBeat(baseRooms:Room[], timeline:Timeline, time:number, activeCharacterId:string):number {
  const { startingKeyframe, activeCharacterI, startingRoomI, startingRoomId, startingCharacterIndices } =
      _collectStartingKeyframeInfo(baseRooms, timeline, time, activeCharacterId);
  const beatKeyframe = findFollowingKeyframe(timeline.keyframes, time, (keyframe) => 
    _isBeatKeyframe(baseRooms, activeCharacterI, startingKeyframe, startingRoomId, startingRoomI, startingCharacterIndices, keyframe)
  );
  return (beatKeyframe) ? beatKeyframe.time : timeline.endTime;
}

export function findPreviousTimelineBeat(baseRooms:Room[], timeline:Timeline, time:number, activeCharacterId:string):number {
  const { startingKeyframe, activeCharacterI, startingRoomI, startingRoomId, startingCharacterIndices } =
      _collectStartingKeyframeInfo(baseRooms, timeline, time, activeCharacterId);
  const beatKeyframe = findPrecedingKeyframe(timeline.keyframes, time, (keyframe) => 
    _isBeatKeyframe(baseRooms, activeCharacterI, startingKeyframe, startingRoomId, startingRoomI, startingCharacterIndices, keyframe)
  );
  return (beatKeyframe) ? beatKeyframe.time : timeline.startTime;
}

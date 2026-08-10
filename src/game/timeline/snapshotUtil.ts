import { assertNonNullable } from "decent-portal";
import Room, { duplicateRoom } from "../types/Room";
import Timeline from "../types/Timeline";
import TimelineKeyframe from "../types/TimelineKeyframe";
import Character, { duplicateCharacter } from "../types/Character";
import GameState from "../types/GameState";
import TimelineSnapshot from "../types/TimelineSnapshot";
import { createKeyframeAtTime } from "./retrievalUtil";

function _createSnapshotRooms(initialRooms:Room[], timeline:Timeline, keyframe:TimelineKeyframe):Room[] {
  return initialRooms.map(room => {
    const roomI = timeline.roomIdToI[room.id];
    assertNonNullable(roomI);
    const items = [...keyframe.rooms[roomI].items];
    return {...room, items};
  });
}

function _createSnapshotCharacters(initialCharacters:Character[], timeline:Timeline, keyframe:TimelineKeyframe):Character[] {
  return initialCharacters.map(character => {
    const characterI = timeline.characterIdToI[character.id];
    assertNonNullable(characterI);
    return {...character, ...keyframe.characters[characterI]}; // This may over-copy one or two members in keyframe that aren't part of Character, but its harmless.
  });
}

// This function does some extra work to create fully-populated characters and rooms. The keyframe retrieval functions are more lightweight and are
// preferable to use if a full snapshot isn't needed. Ideally, one snapshot is created per game loop frame and passed in to whatever needs it.
export function createTimelineSnapshot(gameState:GameState, time:number):TimelineSnapshot {
  const keyframe = createKeyframeAtTime(gameState.timeline.keyframes, time);
  const characters = _createSnapshotCharacters(gameState.baseCharacters, gameState.timeline, keyframe);
  const rooms = _createSnapshotRooms(gameState.baseRooms, gameState.timeline, keyframe);
  return { characters, rooms };
}

export function createInitialTimelineSnapshot(baseCharacters:Character[], baseRooms:Room[]):TimelineSnapshot {
  const characters = baseCharacters.map(duplicateCharacter);
  const rooms = baseRooms.map(duplicateRoom);
  return { characters, rooms };
}
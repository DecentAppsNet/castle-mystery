import { assertNonNullable } from "decent-portal";
import Room from "../types/Room";
import Timeline from "../types/Timeline";
import TimelineKeyframe from "../types/TimelineKeyframe";
import Character from "../types/Character";
import GameState from "../types/GameState";
import TimelineSnapshot from "../types/TimelineSnapshot";
import { createKeyframeAtTime } from "./retrievalUtil";
import CharacterKeyframe from "../types/CharacterKeyframe";
import { findRoomAtPosition } from "../roomUtil";

function _findActiveContext(characters:Character[], rooms:Room[], activeCharacterId:string):{
  activeCharacter:Character,
  activeRoom:Room
} {
  const activeCharacter = characters.find(character => character.id === activeCharacterId);
  assertNonNullable(activeCharacter);
  const activeRoom = findRoomAtPosition(rooms, activeCharacter.position.x, activeCharacter.position.y);
  assertNonNullable(activeRoom);
  return { activeCharacter, activeRoom };
}

function _createSnapshot(characters:Character[], rooms:Room[], activeCharacterId:string):TimelineSnapshot {
  const { activeCharacter, activeRoom } = _findActiveContext(characters, rooms, activeCharacterId);
  return { activeCharacter, activeRoom, characters, rooms };
}

function _combineCharacterWithBase(character:CharacterKeyframe, baseCharacter:Character):Character {
  return {
    // Any members from the keyframe are used.
    isVisible:character.isVisible,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    position:character.position,

    // Permanent members come from base character.
    id:baseCharacter.id,
    title:baseCharacter.title,
    description:baseCharacter.description,
    faceImageUrl:baseCharacter.faceImageUrl,
    randomSalt:baseCharacter.randomSalt,
    
    // Temporal item instances can be shared directly from the keyframe.
    items:character.items,
    leftHandItem:character.leftHandItem,
    rightHandItem:character.rightHandItem,
  }
}

function _createSnapshotRooms(baseRooms:Room[], timeline:Timeline, keyframe:TimelineKeyframe):Room[] {
  return baseRooms.map(room => {
    const roomI = timeline.roomIdToI[room.id];
    assertNonNullable(roomI);
    const items = keyframe.rooms[roomI].items;
    return {...room, items};
  });
}

function _createSnapshotCharacters(baseCharacters:Character[], timeline:Timeline, keyframe:TimelineKeyframe):Character[] {
  return baseCharacters.map(character => {
    const characterI = timeline.characterIdToI[character.id];
    assertNonNullable(characterI);
    return _combineCharacterWithBase(keyframe.characters[characterI], character);
  });
}

// This function does some extra work to create fully-populated characters and rooms. The keyframe retrieval functions are more lightweight and are
// preferable to use if a full snapshot isn't needed. Ideally, one snapshot is created per game loop frame and passed in to whatever needs it.
export function createTimelineSnapshot(gameState:GameState, time:number):TimelineSnapshot {
  const keyframe = createKeyframeAtTime(gameState.timeline.keyframes, time);
  const characters = _createSnapshotCharacters(gameState.baseCharacters, gameState.timeline, keyframe);
  const rooms = _createSnapshotRooms(gameState.baseRooms, gameState.timeline, keyframe);
  return _createSnapshot(characters, rooms, gameState.activeCharacterId);
}

export function createInitialTimelineSnapshot(baseCharacters:Character[], baseRooms:Room[], timeline:Timeline,
    activeCharacterId:string, initialTime:number):TimelineSnapshot {
  const keyframe = createKeyframeAtTime(timeline.keyframes, initialTime);
  const characters = _createSnapshotCharacters(baseCharacters, timeline, keyframe);
  const rooms = _createSnapshotRooms(baseRooms, timeline, keyframe);
  return _createSnapshot(characters, rooms, activeCharacterId);
}

export function updateTimelineSnapshotActiveContext(snapshot:TimelineSnapshot, activeCharacterId:string) {
  const { activeCharacter, activeRoom } = _findActiveContext(snapshot.characters, snapshot.rooms, activeCharacterId);
  snapshot.activeCharacter = activeCharacter;
  snapshot.activeRoom = activeRoom;
}
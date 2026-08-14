import { assertNonNullable } from "decent-portal";
import Room, { duplicateRoom } from "../types/Room";
import Timeline from "../types/Timeline";
import TimelineKeyframe from "../types/TimelineKeyframe";
import Character, { duplicateCharacter } from "../types/Character";
import GameState from "../types/GameState";
import TimelineSnapshot from "../types/TimelineSnapshot";
import { createKeyframeAtTime } from "./retrievalUtil";
import Item from "../types/Item";
import CharacterKeyframe from "../types/CharacterKeyframe";

function _combineItemWithBase(item:Item, baseItemsById:Map<string,Item>):Item {
  const baseItem = baseItemsById.get(item.id);
  assertNonNullable(baseItem);
  const { isDiscovered } = baseItem;
  return isDiscovered ? {...item, isDiscovered} : item;
}

function _combineCharacterWithBase(character:CharacterKeyframe, baseCharacter:Character, baseItemsById:Map<string,Item>):Character {
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

    // These members can mutate permanently to true, independent of game time.
    isDiscovered:baseCharacter.isDiscovered,
    isTitleKnown:baseCharacter.isTitleKnown,
    
    // Items are a combined value from keyframe and base item.
    items:character.items.map(i => _combineItemWithBase(i, baseItemsById)),
    leftHandItem:character.leftHandItem ? _combineItemWithBase(character.leftHandItem, baseItemsById) : null,
    rightHandItem:character.rightHandItem ? _combineItemWithBase(character.rightHandItem, baseItemsById) : null,
  }
}

function _createSnapshotRooms(baseRooms:Room[], baseItemsById:Map<string,Item>, timeline:Timeline, keyframe:TimelineKeyframe):Room[] {
  return baseRooms.map(room => {
    const roomI = timeline.roomIdToI[room.id];
    assertNonNullable(roomI);
    const items = keyframe.rooms[roomI].items.map(i => _combineItemWithBase(i, baseItemsById));
    return {...room, items};
  });
}

function _createSnapshotCharacters(baseCharacters:Character[], baseItemsById:Map<string,Item>, timeline:Timeline, keyframe:TimelineKeyframe):Character[] {
  return baseCharacters.map(character => {
    const characterI = timeline.characterIdToI[character.id];
    assertNonNullable(characterI);
    return _combineCharacterWithBase(keyframe.characters[characterI], character, baseItemsById);
  });
}

// This function does some extra work to create fully-populated characters and rooms. The keyframe retrieval functions are more lightweight and are
// preferable to use if a full snapshot isn't needed. Ideally, one snapshot is created per game loop frame and passed in to whatever needs it.
export function createTimelineSnapshot(gameState:GameState, time:number):TimelineSnapshot {
  const keyframe = createKeyframeAtTime(gameState.timeline.keyframes, time);
  const characters = _createSnapshotCharacters(gameState.baseCharacters, gameState.baseItemsById, gameState.timeline, keyframe);
  const rooms = _createSnapshotRooms(gameState.baseRooms, gameState.baseItemsById, gameState.timeline, keyframe);
  return { characters, rooms };
}

export function createInitialTimelineSnapshot(baseCharacters:Character[], baseRooms:Room[]):TimelineSnapshot {
  const characters = baseCharacters.map(duplicateCharacter);
  const rooms = baseRooms.map(duplicateRoom);
  return { characters, rooms };
}
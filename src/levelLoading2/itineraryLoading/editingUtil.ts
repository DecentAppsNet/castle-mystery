import { assert, assertNonNullable } from "decent-portal";
import ItineraryKeyframe, { duplicateItineraryKeyframe } from "./types/ItineraryKeyframe";
import EditableItineraryKeyframe from "./types/EditableItineraryKeyframe";
import CharacterKeyframe, { CHARACTER_KEYFRAME_KEYS } from "./types/CharacterKeyframe";
import { findInterpolatedCharacterPosition } from "./interpolationUtil";
import RoomKeyframe, { ROOM_KEYFRAME_KEYS } from "./types/RoomKeyframe";
import Character from "@/game/types/Character";
import Room from "@/game/types/Room";
import Item, { duplicateItem } from "@/game/types/Item";
import { duplicatePosition } from "@/game/types/Position";
import EditableItinerary, { createDefaultEditableItinerary } from "./types/EditableItinerary";

function _findInsertAfterI(time:number, keyframes:ItineraryKeyframe[]):number {
  assert(keyframes.length > 0);
  assert(keyframes[0].time <= time, 'Existing first keyframe expected to be the earliest.');
  for(let i = 0; i < keyframes.length; ++i) {
    if (keyframes[i].time > time) return i - 1;
  }
  return keyframes.length - 1;
}

function _findNextKeyframeWithDefinedCharacterPosition(keyframes:EditableItineraryKeyframe[], 
    fromKeyframeI:number, characterI:number):EditableItineraryKeyframe|null {
  for(let keyframeI = fromKeyframeI; keyframeI < keyframes.length; ++keyframeI) {
    const keyframe = keyframes[keyframeI];
    if (keyframe.characters[characterI].position !== undefined) return keyframe;
  } 
  return null;
}

function _generateNextKeyframe(previousKeyframe:ItineraryKeyframe, keyframes:EditableItineraryKeyframe[], 
    keyframeI:number):ItineraryKeyframe {
  const keyframe = keyframes[keyframeI];
  const nextKeyframe = duplicateItineraryKeyframe(previousKeyframe);
  nextKeyframe.time = keyframe.time;
  for(let characterI = 0; characterI < nextKeyframe.characters.length; ++characterI) {
    const characterKeyframe:any = keyframe.characters[characterI];
    CHARACTER_KEYFRAME_KEYS.forEach(key => {
      const keyValue = characterKeyframe[key];
      if (keyValue !== undefined) {
        (nextKeyframe.characters[characterI] as any)[key] = characterKeyframe[key];
        return;
      }
      if (key !== 'position') return;

      const endPositionKeyframe = _findNextKeyframeWithDefinedCharacterPosition(keyframes, keyframeI+1, characterI);
      if (!endPositionKeyframe) return; // No movement between positions for this character.
      const interpolatedPosition = findInterpolatedCharacterPosition(previousKeyframe, 
        endPositionKeyframe, keyframe.time, characterI);
      (nextKeyframe.characters[characterI] as any)[key] = interpolatedPosition;
    });
  }
  for(let roomI = 0; roomI < nextKeyframe.rooms.length; ++roomI) {
    const roomKeyframe:any = keyframe.rooms[roomI];
    ROOM_KEYFRAME_KEYS.forEach(key => {
      const keyValue = roomKeyframe[key];
      if (keyValue === undefined) return;
      (nextKeyframe.rooms[roomI] as any)[key] = roomKeyframe[key];
    });
  }
  return nextKeyframe;
}

// If this gets to be a bottleneck, you can use an algoritm like:
// 1. Receive a fromI param that is set to the earliest known change in frame keying.
// 2. Update existing frames from fromI until a frame is unchanged from its original value. (Signals end of affected keyframes).
function generateKeyframes(editableKeyframes:EditableItineraryKeyframe[]):ItineraryKeyframe[] {
  // Replay every editable (partial) keyframe to generate resolved keyframes.
  assert(editableKeyframes.length >= 1);
  const keyframes:ItineraryKeyframe[] = [];
  let currentKeyframe:ItineraryKeyframe = editableKeyframes[0] as ItineraryKeyframe; // First frame always guaranteed to be resolved.
  for(let i = 0; i < editableKeyframes.length; ++i) {
    if (i > 0) currentKeyframe = _generateNextKeyframe(currentKeyframe, editableKeyframes, i);
    keyframes.push(currentKeyframe);
  }
  return keyframes;
}

function _createCharacterIdToI(characters:Character[]):{[characterId:string]:number} {
  const characterIdToI:{[characterId:string]:number} = {};
  characters.forEach((character, characterI) => {
    characterIdToI[character.id] = characterI;
  });
  return characterIdToI;
}

function _createRoomIdToI(rooms:Room[]):{[roomId:string]:number} {
  const roomIdToI:{[roomId:string]:number} = {};
  rooms.forEach((room, roomI) => {
    roomIdToI[room.id] = roomI;
  });
  return roomIdToI;
}

function _duplicateOptionalItem(item:Item|null):Item|null {
  return item === null ? null : duplicateItem(item);
}

function _createFirstCharacterKeyframe(character:Character):CharacterKeyframe {
  const keyframe:CharacterKeyframe = {
    appearanceId: '', // TODO - add to Character
    isVisible:character.isVisible,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    items:[...character.items.map(duplicateItem)],
    leftHandItem: _duplicateOptionalItem(character.leftHandItem),
    rightHandItem: _duplicateOptionalItem(character.rightHandItem),
    position: duplicatePosition(character.position)
  };
  return keyframe;
}

function _createFirstRoomKeyframe(room:Room):RoomKeyframe {
  const keyframe:RoomKeyframe = {
    items:[...room.items.map(duplicateItem)]
  }
  return keyframe;
}

function _createFirstKeyframe(characters:Character[], rooms:Room[], time:number):ItineraryKeyframe {
  const characterKeyframes = characters.map(c => _createFirstCharacterKeyframe(c));
  const roomKeyFrames = rooms.map(r => _createFirstRoomKeyframe(r));
  return { time, characters:characterKeyframes, rooms:roomKeyFrames };
}

function _addCharacterKeyframeToItineraryKeyframe(characterKeyframe:Partial<CharacterKeyframe>, characterI:number, toKeyframe:EditableItineraryKeyframe) {
  const toCharacterKeyframe:Partial<CharacterKeyframe> = toKeyframe.characters[characterI];
  assertNonNullable(toCharacterKeyframe);
  CHARACTER_KEYFRAME_KEYS.forEach(key => {
    const keyValue = (characterKeyframe as any)[key];
    if (keyValue !== undefined) (toCharacterKeyframe as any)[key] = keyValue;
  });
}

function _createEditableKeyframeFromCharacterKeyframe(characterKeyframe:Partial<CharacterKeyframe>, characterI:number, time:number, characterCount:number, roomCount:number):EditableItineraryKeyframe {
  const characters:Partial<CharacterKeyframe>[] = [];
  for(let i = 0; i < characterCount; ++i) {
    characters[i] = (i === characterI) ? characterKeyframe : {};
  }
  const rooms:Partial<RoomKeyframe>[] = [];
  for(let i = 0; i < roomCount; ++i) { rooms[i] = {}; }
  const keyframe:EditableItineraryKeyframe = { time, characters, rooms };
  return keyframe;
}

function _addRoomKeyframeToItineraryKeyframe(roomKeyframe:Partial<RoomKeyframe>, roomI:number, toKeyframe:EditableItineraryKeyframe) {
  const toRoomKeyframe:Partial<RoomKeyframe> = toKeyframe.rooms[roomI];
  assertNonNullable(toRoomKeyframe);
  ROOM_KEYFRAME_KEYS.forEach(key => {
    const keyValue = (roomKeyframe as any)[key];
    if (keyValue !== undefined) (toRoomKeyframe as any)[key] = keyValue;
  });
}

function _createEditableKeyframeFromRoomKeyframe(roomKeyframe:Partial<CharacterKeyframe>, roomI:number, time:number, characterCount:number, roomCount:number):EditableItineraryKeyframe {
  const characters:Partial<CharacterKeyframe>[] = [];
  for(let i = 0; i < characterCount; ++i) { characters[i] = {}; }
  const rooms:Partial<RoomKeyframe>[] = [];
  for(let i = 0; i < roomCount; ++i) { 
    rooms[i] = (i === roomI) ? roomKeyframe : {};
  }
  const keyframe:EditableItineraryKeyframe = { time, characters, rooms };
  return keyframe;
}

function _getCharacterAndRoomCount(editableItinerary:EditableItinerary):{characterCount:number, roomCount:number} {
  const firstKeyframe = editableItinerary.keyframes[0];
  assertNonNullable(firstKeyframe);
  return { 
    characterCount:firstKeyframe.characters.length,
    roomCount:firstKeyframe.rooms.length
  };
}

function _insertEditableKeyframeAfter(array:EditableItineraryKeyframe[], insertAfterI:number, insertElement:EditableItineraryKeyframe):void {
  array.splice(insertAfterI+1, 0, insertElement);
}

export function addKeyframe(editableKeyframe:EditableItineraryKeyframe, itinerary:EditableItinerary) {
  const insertAfterI = _findInsertAfterI(editableKeyframe.time, itinerary.keyframes);
  _insertEditableKeyframeAfter(itinerary.editableKeyframes, insertAfterI, editableKeyframe);
  itinerary.keyframes = generateKeyframes(itinerary.editableKeyframes);
}

export function addCharacterKeyframe(characterKeyframe:Partial<CharacterKeyframe>, characterI:number, time:number, itinerary:EditableItinerary) {
  const { characterCount, roomCount } = _getCharacterAndRoomCount(itinerary);
  const existingFrame = itinerary.editableKeyframes.find(kf => kf.time === time);
  if (existingFrame) {
    _addCharacterKeyframeToItineraryKeyframe(characterKeyframe, characterI, existingFrame);
    itinerary.keyframes = generateKeyframes(itinerary.editableKeyframes);
  } else {
    const keyframe = _createEditableKeyframeFromCharacterKeyframe(characterKeyframe, characterI, time, characterCount, roomCount);
    addKeyframe(keyframe, itinerary);
  }
}

export function addRoomKeyframe(roomKeyframe:Partial<RoomKeyframe>, roomI:number, time:number, itinerary:EditableItinerary) {
  const { characterCount, roomCount } = _getCharacterAndRoomCount(itinerary);
  const existingFrame = itinerary.editableKeyframes.find(kf => kf.time === time);
  if (existingFrame) {
    _addRoomKeyframeToItineraryKeyframe(roomKeyframe, roomI, existingFrame);
    itinerary.keyframes = generateKeyframes(itinerary.editableKeyframes);
  } else {
    const keyframe = _createEditableKeyframeFromRoomKeyframe(roomKeyframe, roomI, time, characterCount, roomCount);
    addKeyframe(keyframe, itinerary);
  }
}

export function createEditableItinerary(characters:Character[], rooms:Room[], startTime:number):EditableItinerary {
  const itinerary = createDefaultEditableItinerary();
  itinerary.characterIdToI = _createCharacterIdToI(characters);
  itinerary.roomIdToI = _createRoomIdToI(rooms);
  const firstKeyframe = _createFirstKeyframe(characters, rooms, startTime);
  itinerary.keyframes.push(firstKeyframe);
  itinerary.editableKeyframes.push(firstKeyframe); // First keyframe always guaranteed to be fully resolved.
  return itinerary;
}
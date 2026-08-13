/* This module creates and edits partial and resolved timeline keyframes.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable, botch } from "decent-portal";
import TimelineKeyframe, { duplicateTimelineKeyframe } from "@/game/types/TimelineKeyframe";
import EditableTimelineKeyframe from "./types/EditableTimelineKeyframe";
import CharacterKeyframe, { CHARACTER_KEYFRAME_KEYS } from "@/game/types/CharacterKeyframe";
import { findInterpolatedCharacterPosition } from "@/game/timeline";
import RoomKeyframe, { ROOM_KEYFRAME_KEYS } from "@/game/types/RoomKeyframe";
import Character from "@/game/types/Character";
import Room from "@/game/types/Room";
import Item, { duplicateItem } from "@/game/types/Item";
import { duplicatePosition } from "@/game/types/Position";
import EditableTimeline, { createDefaultEditableTimeline } from "./types/EditableTimeline";
import EffectCue from "@/game/types/effectCues/EffectCue";

function _findInsertAfterI(time:number, keyframes:TimelineKeyframe[]):number {
  assert(keyframes.length > 0);
  assert(keyframes[0].time <= time, 'Existing first keyframe expected to be the earliest.');
  for(let i = 0; i < keyframes.length; ++i) {
    if (keyframes[i].time > time) return i - 1;
  }
  return keyframes.length - 1;
}

function _findNextKeyframeWithDefinedCharacterPosition(keyframes:readonly EditableTimelineKeyframe[], 
    fromKeyframeI:number, characterI:number):EditableTimelineKeyframe|null {
  for(let keyframeI = fromKeyframeI; keyframeI < keyframes.length; ++keyframeI) {
    const keyframe = keyframes[keyframeI];
    if (keyframe.characters[characterI].position !== undefined) return keyframe;
  } 
  return null;
}

function _generateNextKeyframe(previousKeyframe:Readonly<TimelineKeyframe>, 
    keyframes:readonly EditableTimelineKeyframe[], keyframeI:number):TimelineKeyframe {
  const keyframe = keyframes[keyframeI];
  const nextKeyframe = duplicateTimelineKeyframe(previousKeyframe);
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
function generateKeyframes(editableKeyframes:readonly EditableTimelineKeyframe[]):TimelineKeyframe[] {
  // Replay every editable (partial) keyframe to generate resolved keyframes.
  assert(editableKeyframes.length >= 1);
  const keyframes:TimelineKeyframe[] = [];
  let currentKeyframe:TimelineKeyframe = editableKeyframes[0] as TimelineKeyframe; // First frame always guaranteed to be resolved.
  for(let i = 0; i < editableKeyframes.length; ++i) {
    if (i > 0) currentKeyframe = _generateNextKeyframe(currentKeyframe, editableKeyframes, i);
    keyframes.push(currentKeyframe);
  }
  return keyframes;
}

function _createCharacterIdToI(characters:readonly Character[]):{[characterId:string]:number} {
  const characterIdToI:{[characterId:string]:number} = {};
  characters.forEach((character, characterI) => {
    characterIdToI[character.id] = characterI;
  });
  return characterIdToI;
}

function _createRoomIdToI(rooms:readonly Room[]):{[roomId:string]:number} {
  const roomIdToI:{[roomId:string]:number} = {};
  rooms.forEach((room, roomI) => {
    roomIdToI[room.id] = roomI;
  });
  return roomIdToI;
}

function _duplicateOptionalItem(item:Readonly<Item>|null):Item|null {
  return item === null ? null : duplicateItem(item);
}

function _createFirstCharacterKeyframe(character:Readonly<Character>):CharacterKeyframe {
  const keyframe:CharacterKeyframe = {
    appearanceId: '', // TODO - add to Character
    isVisible:character.isVisible,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    items:[...character.items.map(duplicateItem)],
    leftHandItem: _duplicateOptionalItem(character.leftHandItem),
    rightHandItem: _duplicateOptionalItem(character.rightHandItem),
    position: duplicatePosition(character.position),
    effectCues:[]
  };
  return keyframe;
}

function _createFirstRoomKeyframe(room:Readonly<Room>):RoomKeyframe {
  const keyframe:RoomKeyframe = {
    items:[...room.items.map(duplicateItem)]
  }
  return keyframe;
}

function _createFirstKeyframe(characters:readonly Character[], rooms:readonly Room[], time:number):TimelineKeyframe {
  const characterKeyframes = characters.map(c => _createFirstCharacterKeyframe(c));
  const roomKeyFrames = rooms.map(r => _createFirstRoomKeyframe(r));
  return { time, characters:characterKeyframes, rooms:roomKeyFrames };
}

function _combineEffectCues(toCharacterKeyframe:Partial<CharacterKeyframe>, effectCues:EffectCue[]):EffectCue[] {
  const toEffectCues:EffectCue[] = toCharacterKeyframe.effectCues ?? [];
  return [...toEffectCues, ...effectCues];
}

function _addCharacterKeyframeToTimelineKeyframe(characterKeyframe:Readonly<Partial<CharacterKeyframe>>, 
    characterI:number, toKeyframe:EditableTimelineKeyframe) {
  const toCharacterKeyframe:Partial<CharacterKeyframe> = toKeyframe.characters[characterI];
  assertNonNullable(toCharacterKeyframe);
  CHARACTER_KEYFRAME_KEYS.forEach(key => {
    const keyValue = (characterKeyframe as any)[key];
    if (keyValue === undefined) return;
    if (key !== 'effectCues') {
      (toCharacterKeyframe as any)[key] = keyValue;
      return;
    }
    toCharacterKeyframe.effectCues = _combineEffectCues(toCharacterKeyframe, keyValue as EffectCue[]);
  });
}

function _createEditableKeyframeFromCharacterKeyframe(characterKeyframe:Readonly<Partial<CharacterKeyframe>>, 
    characterI:number, time:number, characterCount:number, roomCount:number):EditableTimelineKeyframe {
  const characters:Partial<CharacterKeyframe>[] = [];
  for(let i = 0; i < characterCount; ++i) {
    characters[i] = (i === characterI) ? characterKeyframe : {};
  }
  const rooms:Partial<RoomKeyframe>[] = [];
  for(let i = 0; i < roomCount; ++i) { rooms[i] = {}; }
  const keyframe:EditableTimelineKeyframe = { time, characters, rooms };
  return keyframe;
}

function _addRoomKeyframeToTimelineKeyframe(roomKeyframe:Readonly<Partial<RoomKeyframe>>, roomI:number, 
    toKeyframe:EditableTimelineKeyframe) {
  const toRoomKeyframe:Partial<RoomKeyframe> = toKeyframe.rooms[roomI];
  assertNonNullable(toRoomKeyframe);
  ROOM_KEYFRAME_KEYS.forEach(key => {
    const keyValue = (roomKeyframe as any)[key];
    if (keyValue !== undefined) (toRoomKeyframe as any)[key] = keyValue;
  });
}

function _createEditableKeyframeFromRoomKeyframe(roomKeyframe:Readonly<Partial<CharacterKeyframe>>, roomI:number, 
    time:number, characterCount:number, roomCount:number):EditableTimelineKeyframe {
  const characters:Partial<CharacterKeyframe>[] = [];
  for(let i = 0; i < characterCount; ++i) { characters[i] = {}; }
  const rooms:Partial<RoomKeyframe>[] = [];
  for(let i = 0; i < roomCount; ++i) { 
    rooms[i] = (i === roomI) ? roomKeyframe : {};
  }
  const keyframe:EditableTimelineKeyframe = { time, characters, rooms };
  return keyframe;
}

function _getCharacterAndRoomCount(editableTimeline:Readonly<EditableTimeline>)
    :{characterCount:number, roomCount:number} {
  const firstKeyframe = editableTimeline.keyframes[0];
  assertNonNullable(firstKeyframe);
  return { 
    characterCount:firstKeyframe.characters.length,
    roomCount:firstKeyframe.rooms.length
  };
}

function _insertEditableKeyframeAfter(array:EditableTimelineKeyframe[], insertAfterI:number, insertElement:EditableTimelineKeyframe):void {
  array.splice(insertAfterI+1, 0, insertElement);
}

export function addKeyframe(editableKeyframe:Readonly<EditableTimelineKeyframe>, timeline:EditableTimeline) {
  const insertAfterI = _findInsertAfterI(editableKeyframe.time, timeline.keyframes);
  _insertEditableKeyframeAfter(timeline.editableKeyframes, insertAfterI, editableKeyframe);
  timeline.keyframes = generateKeyframes(timeline.editableKeyframes);
}

export function addCharacterKeyframe(characterKeyframe:Readonly<Partial<CharacterKeyframe>>, 
    characterI:number, time:number, timeline:EditableTimeline) {
  const { characterCount, roomCount } = _getCharacterAndRoomCount(timeline);
  const existingFrame = timeline.editableKeyframes.find(kf => kf.time === time);
  if (existingFrame) {
    _addCharacterKeyframeToTimelineKeyframe(characterKeyframe, characterI, existingFrame);
    timeline.keyframes = generateKeyframes(timeline.editableKeyframes);
  } else {
    const keyframe = _createEditableKeyframeFromCharacterKeyframe(characterKeyframe, characterI, time, characterCount, roomCount);
    addKeyframe(keyframe, timeline);
  }
}

export function addRoomKeyframe(roomKeyframe:Readonly<Partial<RoomKeyframe>>, roomI:number, 
    time:number, timeline:EditableTimeline) {
  const { characterCount, roomCount } = _getCharacterAndRoomCount(timeline);
  const existingFrame = timeline.editableKeyframes.find(kf => kf.time === time);
  if (existingFrame) {
    _addRoomKeyframeToTimelineKeyframe(roomKeyframe, roomI, existingFrame);
    timeline.keyframes = generateKeyframes(timeline.editableKeyframes);
  } else {
    const keyframe = _createEditableKeyframeFromRoomKeyframe(roomKeyframe, roomI, time, characterCount, roomCount);
    addKeyframe(keyframe, timeline);
  }
}

export function createEditableTimeline(characters:readonly Character[], rooms:readonly Room[], startTime:number):EditableTimeline {
  const timeline = createDefaultEditableTimeline();
  timeline.characterIdToI = _createCharacterIdToI(characters);
  timeline.roomIdToI = _createRoomIdToI(rooms);
  const firstKeyframe = _createFirstKeyframe(characters, rooms, startTime);
  timeline.keyframes.push(firstKeyframe);
  timeline.editableKeyframes.push(firstKeyframe); // First keyframe always guaranteed to be fully resolved.
  return timeline;
}

function _isEmptyKeyframe(keyframe:Partial<CharacterKeyframe>|Partial<RoomKeyframe>):boolean {
  for (const key in keyframe) {
    if (Object.hasOwn(keyframe, key)) return false;
  }
  return true;
}

export function findLatestKeyFrameForCharacter(timeline:EditableTimeline, characterRef:string|number):TimelineKeyframe {
  const characterI:number = typeof characterRef === 'string' ? timeline.characterIdToI[characterRef] : characterRef;
  assert(timeline.keyframes.length === timeline.editableKeyframes.length);
  for(let i = timeline.editableKeyframes.length - 1; i >= 0; --i) {
    if (!_isEmptyKeyframe(timeline.editableKeyframes[i].characters[characterI])) 
      return timeline.keyframes[i];
  }
  botch(); // There should at least be a first editable keyframe that includes all keys.
}
import { assert, assertNonNullable } from "decent-portal";
import Room from "../types/Room";
import Timeline from "../types/Timeline";
import TimelineKeyframe from "../types/TimelineKeyframe";
import Character from "../types/Character";
import GameState from "../types/GameState";
import TimelineSnapshot from "../types/TimelineSnapshot";
import { createKeyframeAtTime } from "./retrievalUtil";
import CharacterKeyframe from "../types/CharacterKeyframe";
import { findRoomAtPosition } from "../roomUtil";
import CharacterWithEffects from "../types/CharacterWithEffects";

function _findActiveContext(characters:CharacterWithEffects[], rooms:Room[], activeCharacterId:string):{
  activeCharacter:CharacterWithEffects,
  activeRoom:Room
} {
  const activeCharacter = characters.find(character => character.id === activeCharacterId);
  assertNonNullable(activeCharacter);
  const activeRoom = findRoomAtPosition(rooms, activeCharacter.position.x, activeCharacter.position.y);
  assertNonNullable(activeRoom);
  return { activeCharacter, activeRoom };
}

function _createSnapshot(characters:CharacterWithEffects[], rooms:Room[], activeCharacterId:string):TimelineSnapshot {
  const { activeCharacter, activeRoom } = _findActiveContext(characters, rooms, activeCharacterId);
  return { activeCharacter, activeRoom, characters, rooms };
}

function _findCharacterMemberWithSkins(character:CharacterKeyframe, baseCharacter:Character, memberName:string):string|null {
  const { skinId } = character;
  const baseValue = ((baseCharacter as any)[memberName]) ?? null;
  assert(typeof baseValue === 'string' || baseValue === null);
  if (!skinId) return baseValue;
  const skin = baseCharacter.skins.find(s => s.id === skinId);
  assertNonNullable(skin);
  return skin.faceImageUrl ?? baseValue;
}

function _findFaceImageUrlWithSkins(character:CharacterKeyframe, baseCharacter:Character):string|null {
  return _findCharacterMemberWithSkins(character, baseCharacter, 'faceImageUrl');
}

function _findDescriptionWithSkins(character:CharacterKeyframe, baseCharacter:Character):string {
  return _findCharacterMemberWithSkins(character, baseCharacter, 'description') ?? '';
}

function _combineCharacterWithBase(character:CharacterKeyframe, baseCharacter:Character):CharacterWithEffects {
  return {
    // Any members from the keyframe are used.
    isVisible:character.isVisible,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    position:character.position,
    effects:character.effects,

    // Permanent members come from base character.
    id:baseCharacter.id,
    title:baseCharacter.title,
    randomSalt:baseCharacter.randomSalt,
    skins:baseCharacter.skins,

    // Skin-overridable members may come from base character or keyframe-selected skin.
    description:_findDescriptionWithSkins(character, baseCharacter),
    faceImageUrl:_findFaceImageUrlWithSkins(character, baseCharacter),
    
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

function _createSnapshotCharacters(baseCharacters:Character[], timeline:Timeline, keyframe:TimelineKeyframe):CharacterWithEffects[] {
  const characters = baseCharacters.map(character => {
    const characterI = timeline.characterIdToI[character.id];
    assertNonNullable(characterI);
    return _combineCharacterWithBase(keyframe.characters[characterI], character);
  });
  return characters;
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
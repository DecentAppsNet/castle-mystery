import { assert, assertNonNullable } from "decent-portal";
import Room from "../types/Room";
import Timeline from "../types/Timeline";
import TimelineKeyframe, { duplicateTimelineKeyframe } from "../types/TimelineKeyframe";
import Character from "../types/Character";
import GameState from "../types/GameState";
import TimelineSnapshot from "../types/TimelineSnapshot";
import { createKeyframeAtTime, findFollowingKeyframe, findPrecedingKeyframe } from "./retrievalUtil";
import CharacterKeyframe from "../types/CharacterKeyframe";
import { findRoomAtPosition } from "../roomUtil";
import CharacterWithEffects from "../types/CharacterWithEffects";
import { SkinLinkages } from "../types/DiscoveryState";
import { areSkinIdsLinked, createRevealedSkinLinkages } from "../skinLinkageUtil";

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
  const skin = baseCharacter.skins.find(s => s.id === skinId);
  return skin === undefined // Undefined means skinId was the constant indicating no skin applied.
    ? baseValue
    : (skin as any)[memberName] // Override with the skin value, but...
      ?? baseValue; // Not every value is overridden by a skin.
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
    skinId:character.skinId,

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

function _createCharacterSkinIdReplacementKeyframe(keyframe:TimelineKeyframe, characterI:number, skinId:string):TimelineKeyframe {
  assert(characterI < keyframe.characters.length);
  const nextKeyframe = duplicateTimelineKeyframe(keyframe, false);
  nextKeyframe.characters[characterI].skinId = skinId;
  return nextKeyframe;
}

/* If the active character has skin changes that haven't been revealed to player yet, this function
   picks a keyframe that keeps the active camera where it won't reveal more information about the character's skins. */
function _chooseKeyframeToHideUnrevealedSkinChangesAsNeeded(activeSkinIdAtSelection:string, activeCharacterI:number, keyframe:TimelineKeyframe, 
    time:number, timeline:Timeline, revealedSkinLinkages:SkinLinkages):TimelineKeyframe {
  const skinIdAtTime = keyframe.characters[activeCharacterI].skinId;
  if (areSkinIdsLinked(revealedSkinLinkages, activeSkinIdAtSelection, skinIdAtTime)) return keyframe;

  // Find the first preceding keyframe where a revealed skin was used.
  const revealedSkinIds = revealedSkinLinkages[activeSkinIdAtSelection];
  assertNonNullable(revealedSkinIds);
  const predicate = (kf:TimelineKeyframe) => revealedSkinIds.has(kf.characters[activeCharacterI].skinId);
  const precedingKeyframe = findPrecedingKeyframe(timeline.keyframes, time, predicate);
  if (precedingKeyframe) { 
    // Next, find the keyframe immediately following, which will correspond to a change in skin.
    const skinIdBeforeTransform = precedingKeyframe.characters[activeCharacterI].skinId;
    const transformKeyframe = findFollowingKeyframe(timeline.keyframes, precedingKeyframe.time);
    assertNonNullable(transformKeyframe); // Being able to get a preceding keyframe means that there would need to be one following it.
    assert(!predicate(transformKeyframe));
    return _createCharacterSkinIdReplacementKeyframe(transformKeyframe, activeCharacterI, skinIdBeforeTransform);
  }

  // It's possible for there to be no preceding keyframe where character is shown with a revealed skin. This could happen
  // if the initial time was set after the level start time and an obscured skin change happened prior. Check for a keyframe
  // following the current time that has a revealed skin.
  const followingKeyframe = findFollowingKeyframe(timeline.keyframes, time, predicate);
  assertNonNullable(followingKeyframe); // For an active character, at least the keyframe where the character was first active should have a revealed skin ID.
  return followingKeyframe;
}

function _createSnapshotCharacters(baseCharacters:Character[], activeCharacterId:string, activeSkinIdAtSelection:string, 
    revealedSkinLinkages:SkinLinkages, time:number, timeline:Timeline, keyframe:TimelineKeyframe):CharacterWithEffects[] {
  const characters = baseCharacters.map(character => {
    const characterI = timeline.characterIdToI[character.id];
    assertNonNullable(characterI);

    if (character.id === activeCharacterId) {
      keyframe = _chooseKeyframeToHideUnrevealedSkinChangesAsNeeded(activeSkinIdAtSelection, characterI, keyframe, 
          time, timeline, revealedSkinLinkages);
    }
    return _combineCharacterWithBase(keyframe.characters[characterI], character);
  });
  return characters;
}

// This function does some extra work to create fully-populated characters and rooms. The keyframe retrieval functions are more lightweight and are
// preferable to use if a full snapshot isn't needed. Ideally, one snapshot is created per game loop frame and passed in to whatever needs it.
export function createTimelineSnapshot(gameState:GameState, time:number):TimelineSnapshot {
  const keyframe = createKeyframeAtTime(gameState.timeline.keyframes, time);
  const characters = _createSnapshotCharacters(gameState.baseCharacters, gameState.activeCharacterId, gameState.activeSkinIdAtSelection, 
      gameState.discoveryState.revealedSkinLinkages, time, gameState.timeline, keyframe);
  const rooms = _createSnapshotRooms(gameState.baseRooms, gameState.timeline, keyframe);
  return _createSnapshot(characters, rooms, gameState.activeCharacterId);
}

// Create a snapshot for the initial time in the level. Note there is a lot of test code that uses this function as a way to check
// keyframe information without creating gameState instance. Take care not extend its functionality *just* for the test code.
export function createInitialTimelineSnapshot(baseCharacters:Character[], baseRooms:Room[], timeline:Timeline,
    activeCharacterId:string, initialTime:number, obscuredRoomIds:Set<string>):TimelineSnapshot {
  const keyframe = createKeyframeAtTime(timeline.keyframes, initialTime);
  const activeCharacterI = timeline.characterIdToI[activeCharacterId];
  const activeSkinId = keyframe.characters[activeCharacterI].skinId;
  const skinLinkages:SkinLinkages = createRevealedSkinLinkages(timeline.keyframes, baseRooms, obscuredRoomIds);
  const characters = _createSnapshotCharacters(baseCharacters, activeCharacterId, activeSkinId, 
    skinLinkages, initialTime, timeline, keyframe);
  const rooms = _createSnapshotRooms(baseRooms, timeline, keyframe);
  return _createSnapshot(characters, rooms, activeCharacterId);
}

export function updateTimelineSnapshotActiveContext(snapshot:TimelineSnapshot, activeCharacterId:string) {
  const { activeCharacter, activeRoom } = _findActiveContext(snapshot.characters, snapshot.rooms, activeCharacterId);
  snapshot.activeCharacter = activeCharacter;
  snapshot.activeRoom = activeRoom;
}
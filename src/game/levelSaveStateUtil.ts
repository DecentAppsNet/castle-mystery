/* This file captures authoritative level progress and checks saves against freshly loaded game state.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import LevelSaveState from '@/persistence/types/LevelSaveState';
import { createDefaultSkinId } from '@/levelLoading/generalLoading';
import { revealRooms } from './worldProgressUtil';
import { createKeyframeAtTime, createTimelineSnapshot } from './timeline';
import GameState from './types/GameState';

/** Applies a compatible save to freshly created game state, then rebuilds its paused timeline snapshot. */
export function restoreGameStateFromSave(gameState:GameState, save:LevelSaveState):void {
  // Merge saved discoveries into the freshly initialized discovery sets.
  const { discoveryState } = gameState;
  save.discoveredRoomIds.forEach(roomId => discoveryState.discoveredRoomIds.add(roomId));
  save.discoveredItemIds.forEach(itemId => discoveryState.discoveredItemIds.add(itemId));
  save.discoveredSkinIds.forEach(skinId => discoveryState.discoveredSkinIds.add(skinId));
  save.titleKnownCharacterIds.forEach(characterId => discoveryState.titleKnownCharacterIds.add(characterId));

  revealRooms(gameState, save.revealedRoomIds);
  gameState.isLevelComplete = save.isLevelComplete;
  gameState.time = save.time;
  gameState.activeCharacterId = save.activeCharacterId;
  gameState.isPlaying = false;
  gameState.metaTimeToGameTimeOffset = 0;

  // Anchor selection to the actual skin at the saved coordinate, not the initial appearance.
  const keyframe = createKeyframeAtTime(gameState.timeline.keyframes, save.time);
  const characterI = gameState.timeline.characterIdToI[save.activeCharacterId];
  gameState.activeSkinIdAtSelection = keyframe.characters[characterI].skinId;
  gameState.timelineSnapshot = createTimelineSnapshot(gameState, save.time);
}

/** Copies authoritative progress into an independent save, optionally retaining a committed timeline position. */
export function createLevelSaveState(gameState:GameState, committedTime:number = gameState.time):LevelSaveState {
  const { discoveryState } = gameState;
  // Snapshot discoveries and completions; omit derived and transient runtime state.
  return {
    time:committedTime,
    activeCharacterId:gameState.activeCharacterId,
    discoveredRoomIds:[...discoveryState.discoveredRoomIds],
    revealedRoomIds:[...gameState.initiallyObscuredRoomIds].filter(roomId => !discoveryState.obscuredRoomIds.has(roomId)),
    discoveredItemIds:[...discoveryState.discoveredItemIds],
    discoveredSkinIds:[...discoveryState.discoveredSkinIds],
    titleKnownCharacterIds:[...discoveryState.titleKnownCharacterIds],
    isLevelComplete:gameState.isLevelComplete
  };
}

function _incompatible(reason:string):false {
  console.error(`Incompatible level save: ${reason}`);
  return false;
}

function _areIdsKnown(ids:readonly string[], knownIds:ReadonlySet<string>, field:string):boolean {
  const unknownId = ids.find(id => !knownIds.has(id));
  return unknownId === undefined || _incompatible(`${field} references unknown ID "${unknownId}".`);
}

/** Checks a structurally valid save against loaded content, logging the first incompatibility. */
export function isLevelSaveStateCompatible(save:LevelSaveState, gameState:GameState):boolean {
  // Validate selection and discovery references against loaded world membership.
  const characterIds = new Set(gameState.baseCharacters.map(character => character.id));
  const roomIds = new Set(gameState.baseRooms.map(room => room.id));
  const skinIds = new Set(gameState.baseCharacters.flatMap(character =>
    [createDefaultSkinId(character.id), ...character.skins.map(skin => skin.id)]));
  if (!_areIdsKnown([save.activeCharacterId], characterIds, 'activeCharacterId')
    || !_areIdsKnown(save.titleKnownCharacterIds, characterIds, 'titleKnownCharacterIds')
    || !_areIdsKnown(save.discoveredRoomIds, roomIds, 'discoveredRoomIds')
    || !_areIdsKnown(save.revealedRoomIds, roomIds, 'revealedRoomIds')
    || !_areIdsKnown(save.discoveredItemIds, new Set(gameState.baseItemsById.keys()), 'discoveredItemIds')
    || !_areIdsKnown(save.discoveredSkinIds, skinIds, 'discoveredSkinIds')) return false;

  // Keep the absolute saved coordinate within the itinerary-derived timeline bounds.
  const { startTime, endTime } = gameState.timeline;
  if (save.time < startTime || save.time > endTime) {
    return _incompatible(`time ${save.time} is outside timeline bounds [${startTime}, ${endTime}].`);
  }
  return true;
}
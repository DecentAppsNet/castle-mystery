// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import discoverableBecomesTargetsText from './fixtures/discoverable-becomes-targets.md?raw';
import timelineBothTimeAndStartTimeText from '@/game/__tests__/fixtures/timeline-both-time-and-start-time.md?raw';
import unplacedItemsInitializationText from './fixtures/unplaced-items-initialization.md?raw';
import { calcRenderedRoomsBoundingRect } from '@/game/roomRoofUtil';
import { createBecomesCharacterEvent, createInitialPoseEventFromUnpairedCharacter, createItineraryIndex } from '@/game/itineraryUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState } from '../gameUtil';
import { createDefaultCharacter } from '../types/Character';
import { createDefaultLevel } from '../types/Level';
import { createDefaultRoom } from '../types/Room';

const discoverableBecomesTargetsWithoutReplacementMoveText = discoverableBecomesTargetsText
  .replace('\n0:00:03 Niccolo Masked @ Hall', '');

function _createCharacterWithSeededItinerary(characterId:string, title:string, itinerary:ReturnType<typeof createDefaultCharacter>['itinerary']) {
  const baseCharacter = {
    ...createDefaultCharacter(),
    id:characterId,
    title
  };
  const seededItinerary = [createInitialPoseEventFromUnpairedCharacter(baseCharacter), ...itinerary];
  return {
    ...baseCharacter,
    itinerary:seededItinerary,
    itineraryIndex:createItineraryIndex(seededItinerary, baseCharacter.position, baseCharacter.id)
  };
}

function _createBecomesCharacterInitializationLevel() {
  const niccolo = _createCharacterWithSeededItinerary('niccolo', 'Niccolo', [createBecomesCharacterEvent(7_000, 'niccolo', 'niccolo masked')]);
  const niccoloMasked = _createCharacterWithSeededItinerary('niccolo masked', 'Niccolo Masked', []);
  const hall = {
    ...createDefaultRoom(),
    id:'hall',
    title:'Hall'
  };
  return {
    ...createDefaultLevel(),
    rooms:[hall],
    activeCharacterId:'niccolo',
    initialCharacters:[niccolo],
    characters:[niccolo],
    allCharactersById:new Map([
      ['niccolo', niccolo],
      ['niccolo masked', niccoloMasked]
    ])
  };
}

describe('timeline initialization integration', () => {
  it.skip('starts the game state at time while preserving authored slider bounds from startTime and endTime', () => {
    const level = loadLevelFromText(timelineBothTimeAndStartTimeText, 'timeline-both.md');
    const gameState = createGameState(level);

    expect(level.startTime).toBe(10 * 60 * 60 * 1000);
    expect(level.initialTime).toBe(10 * 60 * 60 * 1000 + 30 * 60 * 1000);
    expect(level.endTime).toBe(12 * 60 * 60 * 1000);

    expect(gameState.startTime).toBe(level.startTime);
    expect(gameState.duration).toBe(level.duration);
    expect(gameState.time).toBe(level.initialTime);
    expect(gameState.activeCharacterId).toBe(level.activeCharacterId);
    expect(gameState.groundFloorY).toBe(level.groundFloorY);
    expect(gameState.labels[0]?.minutes).toBe(10 * 60);
    expect(gameState.labels[gameState.labels.length - 1]?.minutes).toBe(12 * 60);
  });

  it.skip('initializes the camera from the full level bounds before the first draw retargets it', () => {
    const level = loadLevelFromText(timelineBothTimeAndStartTimeText, 'timeline-both.md');
    const gameState = createGameState(level);

    expect(gameState.camera.currentRect).toEqual(calcRenderedRoomsBoundingRect(level.rooms, level.groundFloorY));
    expect(gameState.camera.targetRect).toEqual(calcRenderedRoomsBoundingRect(level.rooms, level.groundFloorY));
    expect(gameState.camera.isMoving).toBe(false);
  });

  it.skip('separates declared but unplaced items from initially placed items', () => {
    const level = loadLevelFromText(unplacedItemsInitializationText, 'unplaced-items-initialization.md');
    const gameState = createGameState(level);

    expect(level.discoverableItemCount).toBe(2);
    expect(gameState.discoverableItemCount).toBe(2);
    expect(gameState.itemsById.has('room vase')).toBe(true);
    expect(gameState.itemsById.has('pocket coin')).toBe(true);
    expect(gameState.itemsById.has('broken vase')).toBe(true);

    expect(gameState.rooms[0]?.items.map(item => item.id)).toEqual(['room vase']);
    expect(gameState.characters[0]?.items.map(item => item.id)).toEqual(['pocket coin']);

    expect(Array.from(gameState.unplacedItemsById.keys())).toEqual(['broken vase']);
    expect(Array.from(gameState.initialUnplacedItemsById.keys())).toEqual(['broken vase']);
    expect(gameState.unplacedItemsById.get('broken vase')).toBe(gameState.itemsById.get('broken vase'));
  });

  it.skip('keeps the runtime unplaced pool aligned with rebuild state', () => {
    const level = loadLevelFromText(unplacedItemsInitializationText, 'unplaced-items-initialization.md');
    const gameState = createGameState(level);

    expect(Array.from(gameState.unplacedItemsById.keys())).toEqual(Array.from(gameState.initialUnplacedItemsById.keys()));
  });

  it('separates character replacement targets from initially placed characters', () => {
    const level = _createBecomesCharacterInitializationLevel();
    const gameState = createGameState(level);

    expect(level.discoverableCharacterCount).toBe(0);
    expect(gameState.discoverableCharacterCount).toBe(0);
    expect(gameState.characters.map(character => character.id)).toEqual(['niccolo']);
    expect(Array.from(gameState.unplacedCharactersById.keys())).toEqual(['niccolo masked']);
    expect(Array.from(gameState.initialUnplacedCharactersById.keys())).toEqual(['niccolo masked']);
  });

  it.skip('counts interactive becomes targets in discoverable character and item totals', () => {
    const level = loadLevelFromText(discoverableBecomesTargetsWithoutReplacementMoveText, 'discoverable-becomes-targets.md');
    const gameState = createGameState(level);

    expect(level.discoverableCharacterCount).toBe(3);
    expect(gameState.discoverableCharacterCount).toBe(3);
    expect(level.discoverableItemCount).toBe(2);
    expect(gameState.discoverableItemCount).toBe(2);
  });
});
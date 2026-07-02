// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import becomesCharacterText from './fixtures/becomes-character.md?raw';
import becomesCharacterInventoryFollowupText from './fixtures/becomes-character-inventory-followup.md?raw';
import becomesCharacterLaterAbsoluteText from './fixtures/becomes-character-later-absolute.md?raw';
import becomesCharacterFraternityLikeText from './fixtures/becomes-character-fraternity-like.md?raw';
import becomesCharacterObscuredTransitionText from './fixtures/becomes-character-obscured-transition.md?raw';
import becomesCharacterObscuredArrivalTransitionText from './fixtures/becomes-character-obscured-arrival-transition.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { findCharacterPose } from '../itineraryUtil';
import { createGameState } from '../gameUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { findRoomAtPosition } from '../roomUtil';
import { createImageSetFromLevel } from '../imageSetUtil';
import { findImageBitmap } from '../imageAssetUtil';
import { findActiveCharacter } from '../activeCharacterUtil';

describe('becomes character integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('replaces a character with its declared unplaced target and preserves parked discovery', () => {
    const level = loadLevelFromText(becomesCharacterText, 'becomes-character.md');
    const niccolo = level.characters.find(character => character.id === 'niccolo');
    const becomesEvent = niccolo?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as { startTime:number } | undefined;
    const beforeState = createGameState({ ...level, initialTime:becomesEvent!.startTime - 1 });
    const afterState = createGameState({ ...level, initialTime:becomesEvent!.startTime });

    expect(Array.from(beforeState.unplacedCharactersById.keys())).toEqual(['niccolo masked']);
    expect(beforeState.characters.map(character => character.id)).toEqual(['niccolo']);

    const maskedCharacter = afterState.characters.find(character => character.id === 'niccolo masked');
    expect(maskedCharacter).toBeDefined();
    expect(afterState.activeCharacterId).toBe('niccolo');
    expect(findActiveCharacter(afterState)?.id).toBe('niccolo');
    expect(maskedCharacter?.items.map(item => item.id)).toEqual(['inventory note']);
    expect(maskedCharacter?.leftHandItem?.id).toBe('left pebble');
    expect(maskedCharacter?.rightHandItem?.id).toBe('right twig');
    expect(maskedCharacter?.isVisible).toBe(false);
    expect(Array.from(afterState.unplacedCharactersById.keys())).toEqual(['niccolo']);

    const unplacedNiccolo = afterState.unplacedCharactersById.get('niccolo');
    expect(unplacedNiccolo).toBeDefined();
    if (!unplacedNiccolo) expect.fail('expected Niccolo to be unplaced after replacement');
    expect(unplacedNiccolo.items).toEqual([]);
    expect(unplacedNiccolo.leftHandItem).toBeNull();
    expect(unplacedNiccolo.rightHandItem).toBeNull();

    unplacedNiccolo.isDiscovered = true;
    rebuildDynamicStateForTime(afterState, becomesEvent!.startTime, afterState.time, 0);

    expect(afterState.unplacedCharactersById.get('niccolo')?.isDiscovered).toBe(true);
    const rebuiltMaskedCharacter = afterState.characters.find(character => character.id === 'niccolo masked');
    expect(rebuiltMaskedCharacter?.leftHandItem?.id).toBe('left pebble');
    expect(rebuiltMaskedCharacter?.rightHandItem?.id).toBe('right twig');
    expect(findCharacterPose(rebuiltMaskedCharacter!, 8_000).speech).toBe('Now I speak as the masked one.');
  });

  it('can rebuild while the active focus is an unplaced source character after replacement', () => {
    const level = loadLevelFromText(becomesCharacterText, 'becomes-character.md');
    const niccolo = level.characters.find(character => character.id === 'niccolo');
    const becomesEvent = niccolo?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as { startTime:number } | undefined;
    const gameState = createGameState({ ...level, initialTime:becomesEvent!.startTime });

    gameState.activeCharacterId = 'niccolo';
    rebuildDynamicStateForTime(gameState, becomesEvent!.startTime, gameState.time, 0);

    expect(gameState.activeCharacterId).toBe('niccolo');
    expect(findActiveCharacter(gameState)?.id).toBe('niccolo');
    expect(gameState.unplacedCharactersById.get('niccolo')).toBeDefined();
    expect(findRoomAtPosition(gameState.rooms,
      gameState.unplacedCharactersById.get('niccolo')!.position.x,
      gameState.unplacedCharactersById.get('niccolo')!.position.y)?.id).toBe('hall');
  });

  it('switches focus to the replacement target when the active source is visible in an unobscured room', () => {
    const level = loadLevelFromText(becomesCharacterFraternityLikeText, 'becomes-character-fraternity-like.md');
    const niccolo = level.characters.find(character => character.id === 'niccolo');
    const becomesEvent = niccolo?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as { startTime:number } | undefined;
    const gameState = createGameState({ ...level, initialTime:becomesEvent!.startTime });

    expect(gameState.activeCharacterId).toBe('niccolo masked');
    expect(findActiveCharacter(gameState)?.id).toBe('niccolo masked');
  });

  it('keeps focus on the replacement target when a seamless becomes is rebuilt again', () => {
    const level = loadLevelFromText(becomesCharacterFraternityLikeText, 'becomes-character-fraternity-like.md');
    const niccolo = level.characters.find(character => character.id === 'niccolo');
    const becomesEvent = niccolo?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as { startTime:number } | undefined;
    const gameState = createGameState({ ...level, initialTime:becomesEvent!.startTime });

    rebuildDynamicStateForTime(gameState, becomesEvent!.startTime, gameState.time, 0);

    expect(gameState.activeCharacterId).toBe('niccolo masked');
    expect(findActiveCharacter(gameState)?.id).toBe('niccolo masked');
  });

  it('restores focus to the source when reversing before a seamless becomes', () => {
    const level = loadLevelFromText(becomesCharacterFraternityLikeText, 'becomes-character-fraternity-like.md');
    const niccolo = level.characters.find(character => character.id === 'niccolo');
    const becomesEvent = niccolo?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as { startTime:number } | undefined;
    const gameState = createGameState({ ...level, initialTime:becomesEvent!.startTime });

    rebuildDynamicStateForTime(gameState, becomesEvent!.startTime - 1, gameState.time, 0);

    expect(gameState.activeCharacterId).toBe('niccolo');
    expect(findActiveCharacter(gameState)?.id).toBe('niccolo');
    expect(findRoomAtPosition(gameState.rooms,
      findActiveCharacter(gameState)!.position.x,
      findActiveCharacter(gameState)!.position.y)?.id).not.toBeNull();
  });

  it('applies later absolute room-arrival activities authored for the replacement target', () => {
    const level = loadLevelFromText(becomesCharacterLaterAbsoluteText, 'becomes-character-later-absolute.md');
    const gameState = createGameState({ ...level, initialTime:10_000 });
    const maskedCharacter = gameState.characters.find(character => character.id === 'niccolo masked');

    expect(maskedCharacter).toBeDefined();
    if (!maskedCharacter) expect.fail('expected Niccolo Masked to replace Niccolo by 0:00:10');
    expect(findRoomAtPosition(gameState.rooms, maskedCharacter.position.x, maskedCharacter.position.y)?.id).toBe('hall');
  });

  it('moves Niccolo Masked into Hall in a fraternity-like multi-room level by 23:00:00', () => {
    const level = loadLevelFromText(becomesCharacterFraternityLikeText, 'becomes-character-fraternity-like.md');
    const gameState = createGameState({ ...level, initialTime:23 * 60 * 60 * 1000 });
    const maskedCharacter = gameState.characters.find(character => character.id === 'niccolo masked');

    expect(maskedCharacter).toBeDefined();
    if (!maskedCharacter) expect.fail('expected Niccolo Masked to replace Niccolo by 23:00:00');
    expect(findRoomAtPosition(gameState.rooms, maskedCharacter.position.x, maskedCharacter.position.y)?.id).toBe('hall');
  });

  it('keeps focus on the unplaced source after an obscured-room replacement while the target continues later placed movement', () => {
    const level = loadLevelFromText(becomesCharacterObscuredTransitionText, 'becomes-character-obscured-transition.md');
    const gameState = createGameState({ ...level, initialTime:8_000 });
    const activeCharacter = findActiveCharacter(gameState);
    const maskedCharacter = gameState.characters.find(character => character.id === 'niccolo masked');

    expect(gameState.activeCharacterId).toBe('niccolo');
    expect(activeCharacter).toBe(gameState.unplacedCharactersById.get('niccolo'));
    expect(findRoomAtPosition(gameState.rooms, activeCharacter!.position.x, activeCharacter!.position.y)?.id).toBe('hall');
    expect(maskedCharacter).toBeDefined();
    if (!maskedCharacter) expect.fail('expected Niccolo Masked to be placed after the obscured-room replacement');
    expect(findRoomAtPosition(gameState.rooms, maskedCharacter.position.x, maskedCharacter.position.y)?.id).toBe('nave');
  });

  it('keeps focus on the source when becomes happens immediately after entering an obscured room', () => {
    const level = loadLevelFromText(becomesCharacterObscuredArrivalTransitionText, 'becomes-character-obscured-arrival-transition.md');
    const gameState = createGameState({ ...level, initialTime:8_000 });
    const activeCharacter = findActiveCharacter(gameState);
    const maskedCharacter = gameState.characters.find(character => character.id === 'niccolo masked');

    expect(gameState.activeCharacterId).toBe('niccolo');
    expect(activeCharacter).toBe(gameState.unplacedCharactersById.get('niccolo'));
    expect(findRoomAtPosition(gameState.rooms, activeCharacter!.position.x, activeCharacter!.position.y)?.id).toBe('hall');
    expect(maskedCharacter).toBeDefined();
    if (!maskedCharacter) expect.fail('expected Niccolo Masked to be placed after the obscured-room replacement');
    expect(findRoomAtPosition(gameState.rooms, maskedCharacter.position.x, maskedCharacter.position.y)?.id).toBe('nave');
  });

  it('applies take and drop follow-up inventory events authored for the replacement target', () => {
    const level = loadLevelFromText(becomesCharacterInventoryFollowupText, 'becomes-character-inventory-followup.md');
    const maskedCharacter = level.allCharactersById.get('niccolo masked');
    const takeEvents = maskedCharacter?.itinerary.filter(event => event.type === ItineraryEventType.TAKE_ITEM) || [];
    const dropEvent = maskedCharacter?.itinerary.find(event => event.type === ItineraryEventType.DROP_ITEM);

    expect(takeEvents).toHaveLength(3);
    expect(takeEvents[0]).toMatchObject({ itemId:'chisel', destination:'left-hand' });
    expect(takeEvents[1]).toMatchObject({ itemId:'chisel', destination:'inventory' });
    expect(takeEvents[2]).toMatchObject({ itemId:'chisel', destination:'right-hand' });
    expect(dropEvent).toBeDefined();

    const leftHandState = createGameState({ ...level, initialTime:takeEvents[0]!.startTime });
    const inventoryState = createGameState({ ...level, initialTime:takeEvents[1]!.startTime });
    const rightHandState = createGameState({ ...level, initialTime:takeEvents[2]!.startTime });
    const droppedState = createGameState({ ...level, initialTime:dropEvent!.startTime });

    const leftHandCharacter = leftHandState.characters.find(character => character.id === 'niccolo masked');
    const inventoryCharacter = inventoryState.characters.find(character => character.id === 'niccolo masked');
    const rightHandCharacter = rightHandState.characters.find(character => character.id === 'niccolo masked');
    const droppedCharacter = droppedState.characters.find(character => character.id === 'niccolo masked');

    expect(leftHandCharacter?.leftHandItem?.id).toBe('chisel');
    expect(leftHandCharacter?.items).toEqual([]);
    expect(inventoryCharacter?.leftHandItem).toBeNull();
    expect(inventoryCharacter?.items.map(item => item.id)).toEqual(['chisel']);
    expect(rightHandCharacter?.rightHandItem?.id).toBe('chisel');
    expect(rightHandCharacter?.items).toEqual([]);
    expect(droppedCharacter?.leftHandItem).toBeNull();
    expect(droppedCharacter?.rightHandItem).toBeNull();
    expect(droppedCharacter?.items).toEqual([]);
    expect(droppedState.rooms[0]?.items.map(item => item.id)).toContain('chisel');
  });

  it('loads runtime images for becomes-item targets authored on the replacement target itinerary', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(becomesCharacterInventoryFollowupText, 'becomes-character-inventory-followup.md');
    const maskedCharacter = level.allCharactersById.get('niccolo masked');
    const becomesEvent = maskedCharacter?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_ITEM);
    const imageSet = await createImageSetFromLevel(level);
    const gameState = createGameState({ ...level, initialTime:becomesEvent!.startTime }, imageSet);
    const runtimeMaskedCharacter = gameState.characters.find(character => character.id === 'niccolo masked');

    expect(runtimeMaskedCharacter?.leftHandItem?.id).toBe('brass key');
    expect(findImageBitmap(gameState.imageSet, runtimeMaskedCharacter?.leftHandItem?.imageUrl)).not.toBeNull();
  });
});
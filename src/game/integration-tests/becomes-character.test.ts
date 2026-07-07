// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import becomesCharacterText from './fixtures/becomes-character.md?raw';
import becomesCharacterInventoryFollowupText from './fixtures/becomes-character-inventory-followup.md?raw';
import becomesCharacterLaterAbsoluteText from './fixtures/becomes-character-later-absolute.md?raw';
import becomesCharacterFraternityLikeText from './fixtures/becomes-character-fraternity-like.md?raw';
import becomesCharacterBodyOrientationBeforeReplacementText from './fixtures/becomes-character-body-orientation-before-replacement.md?raw';
import becomesCharacterObscuredTransitionText from './fixtures/becomes-character-obscured-transition.md?raw';
import becomesCharacterObscuredArrivalTransitionText from './fixtures/becomes-character-obscured-arrival-transition.md?raw';
import becomesCharacterPairingKnownObscuredRoomsText from './fixtures/becomes-character-pairing-known-obscured-rooms.md?raw';
import becomesCharacterPairingUnknownObscuredRoomsText from './fixtures/becomes-character-pairing-unknown-obscured-rooms.md?raw';
import becomesCharacterPairingUnknownRevertUnobscuredText from './fixtures/becomes-character-pairing-unknown-revert-unobscured.md?raw';
import fledglingFraternityText from './fixtures/05_fledgling_fraternity.md?raw';
import sharedCharactersText from './fixtures/characters-public.md?raw';
import sharedItemsText from './fixtures/items-public.md?raw';
import sharedRoomStylesText from './fixtures/roomStyles-public.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createLevelTextWithImportTexts } from '@/levelLoading/levelImportUtil';
import { findCharacterPose } from '../itineraryUtil';
import { createGameState } from '../gameUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { findRoomAtPosition } from '../roomUtil';
import { createImageSetFromLevel } from '../imageSetUtil';
import { findImageBitmap } from '../imageAssetUtil';
import { findActiveCharacter } from '../activeCharacterUtil';
import { getKnownItinerary } from '../pairedItineraryUtil';
import { createItineraryMarkerModel } from '@/homeScreen/timeSlider/itineraryMarkerUtil';

describe('becomes character integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function _expectActiveCharacterRoom(levelText:string, filename:string, time:number, expectedCharacterId:string, expectedRoomId:string) {
    const level = loadLevelFromText(levelText, filename);
    const gameState = createGameState({ ...level, initialTime:time });
    const activeCharacter = findActiveCharacter(gameState);

    expect(activeCharacter?.id).toBe(expectedCharacterId);
    expect(findRoomAtPosition(gameState.rooms, activeCharacter!.position.x, activeCharacter!.position.y)?.id).toBe(expectedRoomId);
  }

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

  it.skip('can rebuild while the active focus is an unplaced source character after replacement', () => {
    const level = loadLevelFromText(becomesCharacterText, 'becomes-character.md');
    const niccolo = level.characters.find(character => character.id === 'niccolo');
    expect(niccolo?.isPairingKnown).toBe(false);
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

  it.skip('switches focus to the replacement target when the active source is visible in an unobscured room', () => {
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

  it('keeps a standing body orientation when the source stands before becoming the target', () => {
    const level = loadLevelFromText(becomesCharacterBodyOrientationBeforeReplacementText,
      'becomes-character-body-orientation-before-replacement.md');
    const yusufMasked = level.characters.find(character => character.id === 'yusuf masked');
    const becomesEvent = yusufMasked?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as { startTime:number } | undefined;
    const gameState = createGameState({ ...level, initialTime:becomesEvent!.startTime });
    const yusuf = gameState.characters.find(character => character.id === 'yusuf');

    expect(yusuf).toBeDefined();
    expect(yusuf?.bodyOrientation).toBe('standing');
  });

  it('keeps focus on the initial source before a one-way replacement starts', () => {
    const level = loadLevelFromText(becomesCharacterFraternityLikeText, 'becomes-character-fraternity-like.md');
    const gameState = createGameState(level);

    expect(gameState.activeCharacterId).toBe('niccolo');
    expect(findActiveCharacter(gameState)?.id).toBe('niccolo');
    expect(findRoomAtPosition(gameState.rooms, findActiveCharacter(gameState)!.position.x, findActiveCharacter(gameState)!.position.y)?.id).toBe('forest');
  });

  it.skip('keeps the same initial focus when Niccolo\'s late revert is commented out in fledgling fraternity', () => {
    const mergedCommentedText = createLevelTextWithImportTexts(
      [sharedItemsText, sharedCharactersText, sharedRoomStylesText],
      fledglingFraternityText
    );
    const mergedUncommentedText = createLevelTextWithImportTexts(
      [sharedItemsText, sharedCharactersText, sharedRoomStylesText],
      fledglingFraternityText.replace('//: becomes Niccolo', ': becomes Niccolo')
    );

    const commentedState = createGameState(loadLevelFromText(mergedCommentedText, '05_fledgling_fraternity.md'));
    const uncommentedState = createGameState(loadLevelFromText(mergedUncommentedText, '05_fledgling_fraternity.md'));

    expect(commentedState.activeCharacterId).toBe(uncommentedState.activeCharacterId);
    expect(findActiveCharacter(commentedState)?.id).toBe(findActiveCharacter(uncommentedState)?.id);
    expect(findRoomAtPosition(commentedState.rooms,
      findActiveCharacter(commentedState)!.position.x,
      findActiveCharacter(commentedState)!.position.y)?.id).toBe('forest');
  });

  it.skip('marks Niccolo pairing known at load and exposes merged slider markers in fledgling fraternity', () => {
    const mergedText = createLevelTextWithImportTexts(
      [sharedItemsText, sharedCharactersText, sharedRoomStylesText],
      fledglingFraternityText
    );
    const level = loadLevelFromText(mergedText, '05_fledgling_fraternity.md');
    const loadedNiccolo = level.initialCharacters.find(character => character.id === 'niccolo') || null;
    const gameState = createGameState(level);
    const activeInitialCharacter = gameState.initialCharacters.find(character => character.id === gameState.activeCharacterId)
      || gameState.initialUnplacedCharactersById.get(gameState.activeCharacterId)
      || null;
    const initialRoomId = !activeInitialCharacter
      ? null
      : findRoomAtPosition(gameState.initialRooms, activeInitialCharacter.position.x, activeInitialCharacter.position.y)?.id || null;
    const ownMarkerModel = createItineraryMarkerModel(
      activeInitialCharacter?.itinerary || null,
      gameState.initialRooms,
      initialRoomId,
      gameState.duration,
      gameState.initialCharacters
    );
    const markerModel = createItineraryMarkerModel(
      activeInitialCharacter ? getKnownItinerary(activeInitialCharacter) : null,
      gameState.initialRooms,
      initialRoomId,
      gameState.duration,
      gameState.initialCharacters
    );

    expect(loadedNiccolo?.isPairingKnown).toBe(true);
    expect(activeInitialCharacter?.id).toBe('niccolo');
    expect(activeInitialCharacter?.isPairingKnown).toBe(true);
    expect(markerModel.roomEntryTimes.length).toBeGreaterThan(ownMarkerModel.roomEntryTimes.length);
  });

  it('keeps Niccolo Masked out of Hall immediately after the first replacement in fledgling fraternity', () => {
    const mergedText = createLevelTextWithImportTexts(
      [sharedItemsText, sharedCharactersText, sharedRoomStylesText],
      fledglingFraternityText
    );
    const level = loadLevelFromText(mergedText, '05_fledgling_fraternity.md');
    const niccolo = level.characters.find(character => character.id === 'niccolo');
    const becomesEvent = niccolo?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as { startTime:number } | undefined;
    const atReplacementState = createGameState({ ...level, initialTime:becomesEvent!.startTime });
    const oneSecondLaterState = createGameState({ ...level, initialTime:becomesEvent!.startTime + 1_000 });
    const maskedAtReplacement = atReplacementState.characters.find(character => character.id === 'niccolo masked');
    const maskedOneSecondLater = oneSecondLaterState.characters.find(character => character.id === 'niccolo masked');

    expect(findRoomAtPosition(atReplacementState.rooms, maskedAtReplacement!.position.x, maskedAtReplacement!.position.y)?.id).not.toBe('hall');
    expect(findRoomAtPosition(oneSecondLaterState.rooms, maskedOneSecondLater!.position.x, maskedOneSecondLater!.position.y)?.id).not.toBe('hall');
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

  it.skip('keeps a pairing-known active silhouette on the placed replacement in the first obscured room', () => {
    _expectActiveCharacterRoom(becomesCharacterPairingKnownObscuredRoomsText,
      'becomes-character-pairing-known-obscured-rooms.md', 4_000, 'niccolo', 'hall');
  });

  it.skip('keeps a pairing-known active silhouette on the placed replacement through multiple obscured rooms', () => {
    _expectActiveCharacterRoom(becomesCharacterPairingKnownObscuredRoomsText,
      'becomes-character-pairing-known-obscured-rooms.md', 6_000, 'niccolo', 'crypt');
  });

  it('keeps a pairing-unknown active silhouette on the source in the first obscured room after replacement', () => {
    _expectActiveCharacterRoom(becomesCharacterPairingUnknownObscuredRoomsText,
      'becomes-character-pairing-unknown-obscured-rooms.md', 4_000, 'niccolo', 'hall');
  });

  it('keeps a pairing-unknown active silhouette in the first obscured room while the replacement moves deeper obscured', () => {
    _expectActiveCharacterRoom(becomesCharacterPairingUnknownObscuredRoomsText,
      'becomes-character-pairing-unknown-obscured-rooms.md', 6_000, 'niccolo', 'hall');
  });

  it.skip('moves a pairing-unknown active silhouette into the unobscured room after reverting to the source', () => {
    _expectActiveCharacterRoom(becomesCharacterPairingUnknownRevertUnobscuredText,
      'becomes-character-pairing-unknown-revert-unobscured.md', 7_000, 'niccolo', 'nave');
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
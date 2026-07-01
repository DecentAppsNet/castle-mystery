// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import becomesCharacterText from './fixtures/becomes-character.md?raw';
import becomesCharacterLaterAbsoluteText from './fixtures/becomes-character-later-absolute.md?raw';
import becomesCharacterFraternityLikeText from './fixtures/becomes-character-fraternity-like.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { findCharacterPose } from '../itineraryUtil';
import { createGameState } from '../gameUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { findRoomAtPosition } from '../roomUtil';

describe('becomes character integration', () => {
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
    expect(afterState.characters[afterState.activeCharacterI]?.id).toBe('niccolo masked');
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
});
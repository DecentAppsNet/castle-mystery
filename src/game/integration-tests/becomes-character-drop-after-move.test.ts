// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import becomesCharacterDropAfterMoveText from './fixtures/becomes-character-drop-after-move.md?raw';
import becomesCharacterReverseDropFollowupText from './fixtures/becomes-character-reverse-drop-followup.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState } from '../gameUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { findRoomAtPosition } from '../roomUtil';

describe('becomes character drop after move integration', () => {
  it.skip('replays target drop events after the source moved rooms before replacement', () => {
    const level = loadLevelFromText(becomesCharacterDropAfterMoveText, 'becomes-character-drop-after-move.md');
    const maskedCharacter = level.allCharactersById.get('niccolo masked');
    const dropEvent = maskedCharacter?.itinerary.find(event => event.type === ItineraryEventType.DROP_ITEM) as { startTime:number, itemId:string } | undefined;

    expect(dropEvent).toBeDefined();

    const gameState = createGameState({ ...level, initialTime:dropEvent!.startTime });
    const hall = gameState.rooms.find(room => room.id === 'hall');

    expect(gameState.characters.map(character => character.id)).toEqual(['niccolo masked']);
    expect(hall?.items.map(item => item.id)).toContain('chisel');
    expect(findRoomAtPosition(gameState.rooms, hall!.items[0]!.position.x, hall!.items[0]!.position.y)?.id).toBe('hall');
  });

  it.skip('replays an immediate target drop after a reverse becomes using the replacement room', () => {
    const level = loadLevelFromText(becomesCharacterReverseDropFollowupText, 'becomes-character-reverse-drop-followup.md');
    const niccolo = level.allCharactersById.get('niccolo');
    const dropEvent = niccolo?.itinerary.find(event => event.type === ItineraryEventType.DROP_ITEM) as { startTime:number, itemId:string } | undefined;

    expect(dropEvent).toBeDefined();

    const gameState = createGameState({ ...level, initialTime:dropEvent!.startTime });
    const hall = gameState.rooms.find(room => room.id === 'hall');

    expect(gameState.characters.map(character => character.id)).toEqual(['niccolo']);
    expect(hall?.items.map(item => item.id)).toContain('pig mask');
    expect(findRoomAtPosition(gameState.rooms, hall!.items[0]!.position.x, hall!.items[0]!.position.y)?.id).toBe('hall');
  });
});
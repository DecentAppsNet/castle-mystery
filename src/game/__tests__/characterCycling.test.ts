import { describe, expect, it } from 'vitest';
import { createGameState, updateGameState } from '@/game/gameUtil';
import PlayerEventType from '@/game/playerEvents/types/PlayerEventType';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import levelText from './fixtures/character-cycling.md?raw';

describe('character cycling', () => {
  it('skips noninteractive characters and other rooms, selects the skin, and emits selection feedback', () => {
    const gameState = createGameState(loadValidLevelForTest(levelText, 'character-cycling.md'));
    const pat = gameState.timelineSnapshot.characters.find(character => character.id === 'pat')!;

    updateGameState(gameState, [{ type:PlayerEventType.NEXT_CHARACTER }], 100, 1);

    expect(gameState.activeCharacterId).toBe('pat');
    expect(gameState.activeSkinIdAtSelection).toBe(pat.skinId);
    expect(gameState.timelineSnapshot.activeCharacter.id).toBe('pat');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('hall');
    expect(gameState.characterMetaTimeEffectsByCharacterId.get('pat')).toEqual([
      expect.objectContaining({ kind:'characterSelection', startTime:100 })
    ]);
  });

  it('wraps back to the first eligible character', () => {
    const gameState = createGameState(loadValidLevelForTest(levelText, 'character-cycling.md'));

    updateGameState(gameState, [{ type:PlayerEventType.NEXT_CHARACTER }], 100, 1);
    updateGameState(gameState, [{ type:PlayerEventType.NEXT_CHARACTER }], 200, 1);

    expect(gameState.activeCharacterId).toBe('sam');
  });

  it('does nothing when there is no other interactive character in the room', () => {
    const gameState = createGameState(loadValidLevelForTest(levelText.replace('Hall attendant.', ' '), 'character-cycling.md'));

    updateGameState(gameState, [{ type:PlayerEventType.NEXT_CHARACTER }], 100, 1);

    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.characterMetaTimeEffectsByCharacterId.size).toBe(0);
  });

  it('does not select through an obscured room', () => {
    const gameState = createGameState(loadValidLevelForTest(levelText, 'character-cycling.md'));
    gameState.discoveryState.obscuredRoomIds.add('hall');

    updateGameState(gameState, [{ type:PlayerEventType.NEXT_CHARACTER }], 100, 1);

    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.characterMetaTimeEffectsByCharacterId.size).toBe(0);
  });
});
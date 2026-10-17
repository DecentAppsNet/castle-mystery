import { describe, expect, it } from 'vitest';

import { createGameState, updateGameState } from '@/game/gameUtil';
import PlayerEventType from '@/game/playerEvents/types/PlayerEventType';
import GameState from '@/game/types/GameState';
import { getCharacterHoverRect } from '@/game/drawing/characterDrawUtil';
import { getExitHoverRect } from '@/game/drawing/exitDrawUtil';
import { calcScalingFactorsForRect } from '@/game/drawing/drawUtil';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import roomTraversalText from './fixtures/room-traversal.md?raw';
import characterCyclingText from './fixtures/character-cycling.md?raw';
import discoveryStateText from './fixtures/discovery-state.md?raw';
import skinNavigationText from './fixtures/room-navigation-skins.md?raw';

function _createSkinGameState(activeCharacterId = 'sam') {
  const level = loadValidLevelForTest(skinNavigationText, 'room-navigation-skins.md');
  const initialKeyframe = level.timeline.keyframes[0];
  const keyframes = [0, 1000, 2000].map(time => ({
    ...initialKeyframe,
    time,
    characters:initialKeyframe.characters.map((character, characterI) => {
      if (level.timeline.characterIds[characterI] !== 'pat') return character;
      const room = level.rooms.find(candidate => candidate.id === (time === 2000 ? 'study' : 'hall'))!;
      return { ...character, skinId:time === 0 ? 'pat-default' : 'pat-guard',
        position:{ x:room.rect.x + room.rect.width / 2, y:room.rect.y + room.rect.height / 2, z:0 } };
    })
  }));
  const gameState = createGameState({ ...level, activeCharacterId, initialTime:0,
    timeline:{ ...level.timeline, startTime:0, endTime:2000, keyframes } });
  gameState.discoveryState.discoveredRoomIds.add('study');
  gameState.discoveryState.revealedSkinLinkages['pat-default'] = new Set(['pat-default']);
  gameState.discoveryState.revealedSkinLinkages['pat-guard'] = new Set(['pat-guard']);
  return gameState;
}

function _createGameState() {
  // Use real room geometry with one scheduled segment crossing the keyframe-free center room.
  const level = loadValidLevelForTest(roomTraversalText, 'room-traversal.md');
  const initialKeyframe = level.timeline.keyframes[0];
  const keyframes = ['west', 'east'].map((roomId, keyframeI) => {
    const room = level.rooms.find(candidate => candidate.id === roomId)!;
    const position = { x:room.rect.x + room.rect.width / 2, y:room.rect.y + room.rect.height / 2, z:0 };
    return { ...initialKeyframe, time:keyframeI * 4000, characters:[{ ...initialKeyframe.characters[0], position }] };
  });

  // Discovery is independent of whether the character is currently in the room.
  const gameState = createGameState({ ...level, initialTime:0, timeline:{ ...level.timeline, startTime:0, endTime:4000, keyframes } });
  gameState.discoveryState.discoveredRoomIds.add('center');
  gameState.discoveryState.discoveredRoomIds.add('east');
  return gameState;
}

function _roomSurface(gameState:GameState, roomId:string) {
  const room = gameState.baseRooms.find(candidate => candidate.id === roomId)!;
  return { x:room.rect.x + room.rect.width / 2, y:room.rect.y + room.rect.height / 4 };
}

describe('room navigation events', () => {
  it('switches identity and time with one nimbus and the destination skin', () => {
    const gameState = _createSkinGameState();

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEDOWN, ..._roomSurface(gameState, 'study') }], 100, 1);

    expect(gameState.time).toBeGreaterThan(0);
    expect(gameState.time).toBeLessThanOrEqual(2000);
    expect(gameState.activeCharacterId).toBe('pat');
    expect(gameState.activeSkinIdAtSelection).toBe('pat-guard');
    expect(gameState.timelineSnapshot.activeCharacter.skinId).toBe('pat-guard');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('study');
    expect(gameState.characterMetaTimeEffectsByCharacterId.get('pat')).toEqual([
      expect.objectContaining({ kind:'characterSelection', startTime:100 })
    ]);
  });

  it('does not bypass an active character unrevealed skin change', () => {
    const gameState = _createSkinGameState('pat');

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEDOWN, ..._roomSurface(gameState, 'study') }], 100, 1);

    expect(gameState.time).toBe(0);
    expect(gameState.activeSkinIdAtSelection).toBe('pat-default');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('hall');
    expect(gameState.characterMetaTimeEffectsByCharacterId.size).toBe(0);
  });

  it('ignores the active room surface', () => {
    const gameState = _createGameState();

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEDOWN, ..._roomSurface(gameState, 'west') }], 100, 1);

    expect(gameState.time).toBe(0);
    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.characterMetaTimeEffectsByCharacterId.size).toBe(0);
  });

  it('ignores an undiscovered room and does not show its room pointer', () => {
    const gameState = createGameState(loadValidLevelForTest(discoveryStateText, 'discovery-state.md'));
    gameState.discoveryState.obscuredRoomIds.delete('study');
    const point = _roomSurface(gameState, 'study');

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEMOVE, ...point }, { type:PlayerEventType.MOUSEDOWN, ...point }], 100, 1);

    expect(gameState.hoveredRoomId).toBeNull();
    expect(gameState.time).toBe(0);
    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('hall');
  });

  it('ignores a discovered but obscured room and does not show its room pointer', () => {
    const gameState = createGameState(loadValidLevelForTest(discoveryStateText, 'discovery-state.md'));
    gameState.discoveryState.discoveredRoomIds.add('study');
    const point = _roomSurface(gameState, 'study');

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEMOVE, ...point }, { type:PlayerEventType.MOUSEDOWN, ...point }], 100, 1);

    expect(gameState.hoveredRoomId).toBeNull();
    expect(gameState.time).toBe(0);
    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('hall');
  });

  it('shows an eligible unreachable room pointer but preserves playback and selection on click', () => {
    const initialState = _createGameState();
    const gameState:GameState = { ...initialState,
      timeline:{ ...initialState.timeline, keyframes:[initialState.timeline.keyframes[0]] } };
    gameState.isPlaying = true;
    gameState.metaTimeToGameTimeOffset = -100;
    const point = _roomSurface(gameState, 'center');

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEMOVE, ...point }, { type:PlayerEventType.MOUSEDOWN, ...point }], 100, 1);

    expect(gameState.isLevelComplete).toBe(true);
    expect(gameState.hoveredRoomId).toBe('center');
    expect(gameState.time).toBe(0);
    expect(gameState.isPlaying).toBe(true);
    expect(gameState.metaTimeToGameTimeOffset).toBe(-100);
    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.metaTimeEffects).toEqual([]);
    expect(gameState.characterMetaTimeEffectsByCharacterId.size).toBe(0);
  });

  it('uses the same pause and offset policy as an explicit time change', () => {
    const navigationState = _createGameState();
    const changeTimeState = _createGameState();
    navigationState.isPlaying = changeTimeState.isPlaying = true;
    navigationState.metaTimeToGameTimeOffset = changeTimeState.metaTimeToGameTimeOffset = 50;

    updateGameState(navigationState, [{ type:PlayerEventType.MOUSEDOWN, ..._roomSurface(navigationState, 'center') }], 100, 1);
    updateGameState(changeTimeState, [{ type:PlayerEventType.CHANGE_TIME, time:2000 }], 100, 1);

    expect(navigationState.time).toBe(changeTimeState.time);
    expect(navigationState.isPlaying).toBe(false);
    expect(navigationState.metaTimeToGameTimeOffset).toBe(0);
    expect(navigationState.metaTimeEffects.map(({ kind, startTime, endTime }) => ({ kind, startTime, endTime })))
      .toEqual(changeTimeState.metaTimeEffects.map(({ kind, startTime, endTime }) => ({ kind, startTime, endTime })));
    expect(navigationState.metaTimeEffects).toHaveLength(1);
  });

  it('navigates to a transit-only room without adding a time-only selection nimbus', () => {
    const gameState = _createGameState();

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEDOWN, ..._roomSurface(gameState, 'center') }], 100, 1);

    expect(gameState.time).toBe(2000);
    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('center');
    expect(gameState.characterMetaTimeEffectsByCharacterId.size).toBe(0);
    expect(gameState.hoveredRoomId).toBeNull();
  });

  it('keeps an exit popup and room pointer while allowing the click to navigate', () => {
    const gameState = _createGameState();
    gameState.scalingFactors = calcScalingFactorsForRect({ x:0, y:0, width:100, height:100 }, 1000, 1000);
    const west = gameState.baseRooms.find(room => room.id === 'west')!;
    const exit = west.exits[0];
    const rect = getExitHoverRect(exit, gameState.scalingFactors);
    const point = { x:rect.x + rect.width / 2, y:rect.y + rect.height / 2 };

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEMOVE, ...point }], 100, 1);

    expect(gameState.hoveredExitKey).toBe(exit.id);
    expect(gameState.hoveredRoomId).toBe('center');

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEDOWN, ...point }], 200, 1);

    expect(gameState.timelineSnapshot.activeRoom.id).toBe('center');
    expect(gameState.time).toBe(2000);
  });

  it('retains direct character selection before room navigation', () => {
    const gameState = createGameState(loadValidLevelForTest(characterCyclingText, 'character-cycling.md'));
    gameState.scalingFactors = calcScalingFactorsForRect({ x:0, y:0, width:100, height:100 }, 1000, 1000);
    const pat = gameState.timelineSnapshot.characters.find(character => character.id === 'pat')!;
    const rect = getCharacterHoverRect(pat, pat.position, gameState.scalingFactors, gameState.time, gameState.imageSet);
    const point = { x:rect.x + rect.width / 2, y:rect.y + rect.height / 2 };

    updateGameState(gameState, [{ type:PlayerEventType.MOUSEDOWN, ...point }], 100, 1);

    expect(gameState.activeCharacterId).toBe('pat');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('hall');
    expect(gameState.characterMetaTimeEffectsByCharacterId.get('pat')).toEqual([
      expect.objectContaining({ kind:'characterSelection', startTime:100 })
    ]);
  });
});
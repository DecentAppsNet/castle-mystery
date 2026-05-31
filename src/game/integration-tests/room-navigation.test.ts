// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createItineraryIndex, createRoomEntryEvent } from '../itineraryUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { updateGameStateForMouseDown, updateGameStateForMouseMove } from '../hoverStateUtil';
import { createGameState } from '../gameUtil';
import { ROOM_BACK_Z, ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';
import Level, { createDefaultLevel } from '../types/Level';
import Character, { createDefaultCharacter } from '../types/Character';
import Room, { createDefaultRoom } from '../types/Room';
import PlayerEventType from '../types/playerEvents/PlayerEventType';

const BACK_ROW_Z = ROOM_BACK_Z;
const DEFAULT_CHARACTER_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;

function _createRoom(id:string, x:number):Room {
  return {
    ...createDefaultRoom(),
    id,
    title:id,
    rect:{ x, y:0, width:10, height:10 }
  };
}

function _createCharacter(id:string, x:number, itinerary:Character['itinerary']):Character {
  return {
    ...createDefaultCharacter(),
    id,
    title:id,
    description:id,
    x,
    y:5,
    depth:DEFAULT_CHARACTER_DEPTH,
    waypoint:{ position:{ x, y:5, z:BACK_ROW_Z }, adjacentWaypoints:[], exitDirections:{} },
    itinerary,
    itineraryIndex:createItineraryIndex(itinerary, { x, y:5, z:DEFAULT_CHARACTER_DEPTH })
  };
}

function _createLevel(characters:Character[]):Level {
  const rooms = [_createRoom('foyer', 0), _createRoom('library', 20)];
  return {
    ...createDefaultLevel(),
    rooms,
    initialCharacters:characters,
    characters,
    groundFloorY:10,
    activeCharacterId:characters[0].id,
    initialTime:500,
    endTime:5_000,
    duration:5_000
  };
}

function _setScalingFactors(gameState:ReturnType<typeof createGameState>) {
  gameState.scalingFactors = {
    sourceX:0,
    sourceY:0,
    sourceWidth:100,
    sourceHeight:100,
    scaleX:1,
    translateX:0,
    scaleY:1,
    translateY:0,
    roomFontHeight:20,
    roomLineWidth:2,
    destWidth:100,
    destHeight:100
  };
}

describe('room navigation integration', () => {
  it('shows a navigable hovered room when the mouse is over a discovered room without another popover target', () => {
    const hero = _createCharacter('hero', 5, [createRoomEntryEvent(1_000, 'library')]);
    const gameState = createGameState(_createLevel([hero]));
    gameState.isLevelComplete = false;
    _setScalingFactors(gameState);
    gameState.rooms[1].isDiscovered = true;

    updateGameStateForMouseMove(gameState, { type:PlayerEventType.MOUSEMOVE, x:25, y:5 });

    expect(gameState.hoveredRoomId).toBe('library');
  });

  it('does not treat the active room as navigable for hover or click', () => {
    const hero = _createCharacter('hero', 5, [createRoomEntryEvent(1_000, 'library')]);
    const gameState = createGameState(_createLevel([hero]));
    gameState.isLevelComplete = false;
    _setScalingFactors(gameState);
    gameState.rooms[0].isDiscovered = true;
    gameState.time = 750;

    updateGameStateForMouseMove(gameState, { type:PlayerEventType.MOUSEMOVE, x:5, y:5 });

    expect(gameState.hoveredRoomId).toBe(null);

    updateGameStateForMouseDown(gameState, { type:PlayerEventType.MOUSEDOWN, x:5, y:5 });

    expect(gameState.time).toBe(750);
  });

  it('jumps to the nearest room entry time in the active character itinerary when clicking a discovered room', () => {
    const hero = _createCharacter('hero', 5, [createRoomEntryEvent(1_000, 'library'), createRoomEntryEvent(3_000, 'library')]);
    const gameState = createGameState(_createLevel([hero]));
    gameState.isLevelComplete = false;
    _setScalingFactors(gameState);
    gameState.rooms[1].isDiscovered = true;
    gameState.characters[0].discoveredRoomIds = ['foyer', 'library'];
    gameState.time = 2_600;

    updateGameStateForMouseDown(gameState, { type:PlayerEventType.MOUSEDOWN, x:25, y:5 });

    expect(gameState.time).toBeGreaterThan(3_000);
    expect(gameState.time).toBeLessThanOrEqual(5_000);
  });

  it('clamps the room navigation offset to the level end time', () => {
    const hero = _createCharacter('hero', 5, [createRoomEntryEvent(4_950, 'library')]);
    const gameState = createGameState(_createLevel([hero]));
    gameState.isLevelComplete = false;
    _setScalingFactors(gameState);
    gameState.rooms[1].isDiscovered = true;
    gameState.characters[0].discoveredRoomIds = ['foyer', 'library'];
    gameState.time = 4_900;

    updateGameStateForMouseDown(gameState, { type:PlayerEventType.MOUSEDOWN, x:25, y:5 });

    expect(gameState.time).toBe(5_000);
  });

  it('falls back to another character that discovered the room and jumps to that room entry time', () => {
    const hero = _createCharacter('hero', 5, []);
    const guide = _createCharacter('guide', 25, [createRoomEntryEvent(2_000, 'library')]);
    const gameState = createGameState(_createLevel([hero, guide]));
    gameState.isLevelComplete = false;
    _setScalingFactors(gameState);
    gameState.rooms[1].isDiscovered = true;
    gameState.characters[1].discoveredRoomIds = ['library'];
    rebuildDynamicStateForTime(gameState, gameState.time);

    updateGameStateForMouseDown(gameState, { type:PlayerEventType.MOUSEDOWN, x:25, y:5 });

    expect(gameState.characters[gameState.activeCharacterI]?.id).toBe('guide');
    expect(gameState.time).toBeGreaterThan(2_000);
    expect(gameState.time).toBeLessThanOrEqual(5_000);
  });

  it('preserves discovered rooms by character across time rebuilds', () => {
    const hero = _createCharacter('hero', 5, []);
    const guide = _createCharacter('guide', 25, [createRoomEntryEvent(2_000, 'library')]);
    const gameState = createGameState(_createLevel([hero, guide]));
    gameState.isLevelComplete = false;
    gameState.characters[1].discoveredRoomIds = ['library'];

    rebuildDynamicStateForTime(gameState, 1_000, 0);

    expect(gameState.characters.find(character => character.id === 'guide')?.discoveredRoomIds).toContain('library');
  });
});
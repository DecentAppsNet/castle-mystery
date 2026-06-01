// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { createGameState } from '../gameUtil';
import { updateGameStateForMouseMove } from '../hoverStateUtil';
import { createItineraryIndex } from '../itineraryUtil';
import { ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';
import { syncSolutionsWithUnlocks } from '../solutions/solutionDiscoveryUtil';
import { updateGameStateForChangeSolutions } from '../solutionStateUtil';
import ClozePartType from '../solutions/types/ClozePartType';
import { createDefaultSolution } from '../solutions/types/Solution';
import Itinerary from '../types/Itinerary';
import Level, { createDefaultLevel } from '../types/Level';
import { createDefaultCharacter } from '../types/Character';
import { createDefaultRoom } from '../types/Room';
import PlayerEventType from '../types/playerEvents/PlayerEventType';

function _createTestLevel():Level {
  const initialPosition = { x:5, y:5, z:ROOM_MIDDLE_ROW_CENTER_Z };
  const waypoint = { position:initialPosition, adjacentWaypoints:[], exitDirections:{} };
  const itinerary:Itinerary = [];
  const bookItem = {
    id:'book',
    title:'Book',
    displayChar:'B',
    position:{ x:6, y:5, z:ROOM_MIDDLE_ROW_CENTER_Z },
    description:'A test book.',
    isDiscovered:false,
    isExamined:false
  };

  return {
    ...createDefaultLevel(),
    rooms:[{
      ...createDefaultRoom(),
      id:'hall',
      title:'Hall',
      items:[bookItem],
      waypoints:[waypoint]
    }, {
      ...createDefaultRoom(),
      id:'study',
      title:'Study',
      rect:{ x:10, y:0, width:10, height:10 },
      isObscured:true
    }],
    initialCharacters:[{
      ...createDefaultCharacter(),
      id:'hero',
      title:'Hero',
      description:'Test hero.',
      x:initialPosition.x,
      y:initialPosition.y,
      depth:ROOM_MIDDLE_ROW_CENTER_Z,
      waypoint,
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    characters:[{
      ...createDefaultCharacter(),
      id:'hero',
      title:'Hero',
      description:'Test hero.',
      x:initialPosition.x,
      y:initialPosition.y,
      depth:ROOM_MIDDLE_ROW_CENTER_Z,
      waypoint,
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    itemsById:new Map([['book', bookItem]]),
    solutions:[
      {
        ...createDefaultSolution(),
        id:'open',
        title:'Open',
        parts:[{ type:ClozePartType.text, text:'Open' }],
        isLocked:false,
        unlockSolutionIds:['solution locked'],
        revealRoomIds:['study']
      },
      {
        ...createDefaultSolution(),
        id:'solution locked',
        title:'Solution Locked',
        parts:[{ type:ClozePartType.text, text:'Solution Locked' }],
        isLocked:true,
      }
    ],
    winSynopsis:'Solved it.',
    groundFloorY:10,
    activeCharacterId:'hero',
    endTime:5_000,
    duration:5_000,
    labels:[{ minutes:0, label:'midnight' }, { minutes:5 / 60, label:'12:05am' }]
  };
}

describe('solution unlock integration', () => {
  it('preserves authored outgoing unlock edges and initial locked targets in the game state', () => {
    const gameState = createGameState(_createTestLevel());

    expect(gameState.solutions.map(solution => solution.isLocked)).toEqual([false, true]);
    expect(gameState.solutions[0].unlockSolutionIds).toEqual(['solution locked']);
    expect(gameState.solutions[1].unlockSolutionIds).toEqual([]);
    expect(gameState.isLevelComplete).toBe(false);
    expect(gameState.winSynopsis).toBe('Solved it.');
  });

  it('unlocks solutions listed by a completed solution', () => {
    const gameState = createGameState(_createTestLevel());

    const completedSolutions = gameState.solutions.map(solution => solution.id === 'open'
      ? { ...solution, isComplete:true }
      : solution);
    const afterSolutionUnlock = syncSolutionsWithUnlocks(completedSolutions).solutions;
    expect(afterSolutionUnlock.map(solution => solution.isLocked)).toEqual([false, false]);
  });

  it('marks the game state complete when all solutions begin unlocked and complete', () => {
    const completeLevel = {
      ..._createTestLevel(),
      solutions:_createTestLevel().solutions.map(solution => ({ ...solution, isLocked:false, isComplete:true }))
    };

    expect(createGameState(completeLevel).isLevelComplete).toBe(true);
  });

  it('reveals rooms from completed solutions and preserves that reveal across time rebuilds', () => {
    const gameState = createGameState(_createTestLevel());
    const studyBeforeReveal = gameState.rooms.find(room => room.id === 'study') || null;
    const initialStudyBeforeReveal = gameState.initialRooms.find(room => room.id === 'study') || null;

    expect(studyBeforeReveal?.isObscured).toBe(true);
    expect(initialStudyBeforeReveal?.isObscured).toBe(true);

    const nextSolutions = gameState.solutions.map(solution => solution.id === 'open'
      ? { ...solution, isComplete:true }
      : solution);
    updateGameStateForChangeSolutions(gameState, { type:PlayerEventType.CHANGE_SOLUTIONS, solutions:nextSolutions });

    expect(gameState.rooms.find(room => room.id === 'study')?.isObscured).toBe(false);
    expect(gameState.initialRooms.find(room => room.id === 'study')?.isObscured).toBe(false);

    rebuildDynamicStateForTime(gameState, 1_000, 0);

    expect(gameState.rooms.find(room => room.id === 'study')?.isObscured).toBe(false);
  });

  it('discovers and examines hovered items, preserving that state across time rebuilds', () => {
    const gameState = createGameState(_createTestLevel());
    gameState.scalingFactors = {
      sourceX:0,
      sourceY:0,
      sourceWidth:10,
      sourceHeight:10,
      scaleX:10,
      translateX:0,
      scaleY:10,
      translateY:0,
      roomFontHeight:20,
      roomLineWidth:2,
      destWidth:100,
      destHeight:100
    };

    const itemBeforeHover = gameState.rooms[0].items[0];
    expect(itemBeforeHover.isDiscovered).toBe(false);
    expect(itemBeforeHover.isExamined).toBe(false);

    updateGameStateForMouseMove(gameState, { type:PlayerEventType.MOUSEMOVE, x:7, y:10 });

    const itemAfterHover = gameState.rooms[0].items[0];
    expect(itemAfterHover.isDiscovered).toBe(true);
    expect(itemAfterHover.isExamined).toBe(true);
    expect(gameState.viewedItemIds.has('Book')).toBe(true);

    rebuildDynamicStateForTime(gameState, 1_000, 0);

    const itemAfterRebuild = gameState.rooms[0].items[0];
    expect(itemAfterRebuild.isDiscovered).toBe(true);
    expect(itemAfterRebuild.isExamined).toBe(true);
  });
});

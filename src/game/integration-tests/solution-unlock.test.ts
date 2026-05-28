// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { createGameState } from '../gameUtil';
import { updateGameStateForMouseMove } from '../hoverStateUtil';
import { createItineraryIndex } from '../itineraryUtil';
import { syncSolutionsWithUnlocks } from '../solutions/solutionDiscoveryUtil';
import ClozePartType from '../solutions/types/ClozePartType';
import Itinerary from '../types/Itinerary';
import Level from '../types/Level';
import PlayerEventType from '../types/playerEvents/PlayerEventType';

function _createTestLevel():Level {
  const initialPosition = { x:5, y:5 };
  const waypoint = { position:initialPosition, adjacentWaypoints:[], exitDirections:{} };
  const itinerary:Itinerary = [];
  const bookItem = {
    id:'book',
    title:'Book',
    displayChar:'B',
    position:{ x:6, y:5 },
    depth:0.5,
    description:'A test book.',
    isDiscovered:false,
    isExamined:false
  };

  return {
    rooms:[{
      id:'hall',
      title:'Hall',
      rect:{ x:0, y:0, width:10, height:10 },
      isObscured:false,
      items:[bookItem],
      exits:[],
      stairs:[],
      waypoints:[waypoint],
      isDiscovered:false
    }],
    initialCharacters:[{
      id:'hero',
      title:'Hero',
      faceImageUrl:null,
      randomSalt:0,
      isTitleKnown:true,
      description:'Test hero.',
      items:[],
      x:initialPosition.x,
      y:initialPosition.y,
      depth:0.5,
      waypoint,
      discoveredRoomIds:[],
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    characters:[{
      id:'hero',
      title:'Hero',
      faceImageUrl:null,
      randomSalt:0,
      isTitleKnown:true,
      description:'Test hero.',
      items:[],
      x:initialPosition.x,
      y:initialPosition.y,
      depth:0.5,
      waypoint,
      discoveredRoomIds:[],
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    itemsById:new Map([['book', bookItem]]),
    solutions:[
      {
        id:'open',
        title:'Open',
        parts:[{ type:ClozePartType.text, text:'Open' }],
        isComplete:false,
        isLocked:false,
        unlockForItemId:null,
        unlockForSolutionId:null
      },
      {
        id:'item locked',
        title:'Item Locked',
        parts:[{ type:ClozePartType.text, text:'Item Locked' }],
        isComplete:false,
        isLocked:true,
        unlockForItemId:'book',
        unlockForSolutionId:null
      },
      {
        id:'solution locked',
        title:'Solution Locked',
        parts:[{ type:ClozePartType.text, text:'Solution Locked' }],
        isComplete:false,
        isLocked:true,
        unlockForItemId:null,
        unlockForSolutionId:'open'
      }
    ],
    winSynopsis:'Solved it.',
    activeCharacterId:'hero',
    startTime:0,
    initialTime:0,
    endTime:5_000,
    duration:5_000,
    labels:[{ minutes:0, label:'midnight' }, { minutes:5 / 60, label:'12:05am' }]
  };
}

describe('solution unlock integration', () => {
  it('preserves authored lock prerequisites in the initial game state', () => {
    const gameState = createGameState(_createTestLevel());

    expect(gameState.solutions.map(solution => solution.isLocked)).toEqual([false, true, true]);
    expect(gameState.isLevelComplete).toBe(false);
    expect(gameState.winSynopsis).toBe('Solved it.');
  });

  it('unlocks item-based and solution-based prerequisites when their requirements are met', () => {
    const gameState = createGameState(_createTestLevel());

    const afterItemUnlock = syncSolutionsWithUnlocks(gameState.solutions, new Set(['Book'])).solutions;
    expect(afterItemUnlock.map(solution => solution.isLocked)).toEqual([false, false, true]);

    afterItemUnlock[0] = { ...afterItemUnlock[0], isComplete:true };
    const afterSolutionUnlock = syncSolutionsWithUnlocks(afterItemUnlock, new Set(['Book'])).solutions;
    expect(afterSolutionUnlock.map(solution => solution.isLocked)).toEqual([false, false, false]);
  });

  it('marks the game state complete when all solutions begin unlocked and complete', () => {
    const completeLevel = {
      ..._createTestLevel(),
      solutions:_createTestLevel().solutions.map(solution => ({ ...solution, isLocked:false, isComplete:true }))
    };

    expect(createGameState(completeLevel).isLevelComplete).toBe(true);
  });

  it('discovers and examines hovered items, preserving that state across time rebuilds', () => {
    const gameState = createGameState(_createTestLevel());
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

    const itemBeforeHover = gameState.rooms[0].items[0];
    expect(itemBeforeHover.isDiscovered).toBe(false);
    expect(itemBeforeHover.isExamined).toBe(false);

    updateGameStateForMouseMove(gameState, { type:PlayerEventType.MOUSEMOVE, x:6, y:5 });

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

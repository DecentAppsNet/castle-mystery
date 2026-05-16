import { describe, expect, it } from 'vitest';

import { createGameState } from '../gameUtil';
import { createItineraryIndex } from '../itineraryUtil';
import { syncSolutionsWithUnlocks } from '../solutions/solutionDiscoveryUtil';
import ClozePartType from '../solutions/types/ClozePartType';
import Itinerary from '../types/Itinerary';
import Level from '../types/Level';

function _createTestLevel():Level {
  const initialPosition = { x:5, y:5 };
  const waypoint = { position:initialPosition, adjacentWaypoints:[], exitDirections:{} };
  const itinerary:Itinerary = [];

  return {
    rooms:[{
      id:'Hall',
      title:'Hall',
      rect:{ x:0, y:0, width:10, height:10 },
      isObscured:false,
      items:[{
        id:'Book',
        title:'Book',
        displayChar:'B',
        position:{ x:6, y:5 },
        description:'A test book.',
        isDiscovered:false
      }],
      obstructions:[],
      exits:[],
      waypoints:[waypoint],
      positionMarkersById:{},
      isDiscovered:false
    }],
    initialCharacters:[{
      id:'Hero',
      title:'Hero',
      faceImageUrl:null,
      randomSalt:0,
      isTitleKnown:true,
      description:'Test hero.',
      items:[],
      x:initialPosition.x,
      y:initialPosition.y,
      waypoint,
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    characters:[{
      id:'Hero',
      title:'Hero',
      faceImageUrl:null,
      randomSalt:0,
      isTitleKnown:true,
      description:'Test hero.',
      items:[],
      x:initialPosition.x,
      y:initialPosition.y,
      waypoint,
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    solutions:[
      {
        id:'Open',
        title:'Open',
        parts:[{ type:ClozePartType.text, text:'Open' }],
        isComplete:false,
        isLocked:false,
        unlockForItemId:null,
        unlockForSolutionId:null
      },
      {
        id:'Item Locked',
        title:'Item Locked',
        parts:[{ type:ClozePartType.text, text:'Item Locked' }],
        isComplete:false,
        isLocked:true,
        unlockForItemId:'Book',
        unlockForSolutionId:null
      },
      {
        id:'Solution Locked',
        title:'Solution Locked',
        parts:[{ type:ClozePartType.text, text:'Solution Locked' }],
        isComplete:false,
        isLocked:true,
        unlockForItemId:null,
        unlockForSolutionId:'Open'
      }
    ],
    activeCharacterId:'Hero',
    startTime:0,
    duration:5_000,
    labels:[{ minutes:0, label:'midnight' }, { minutes:5 / 60, label:'12:05am' }]
  };
}

describe('solution unlock integration', () => {
  it('preserves authored lock prerequisites in the initial game state', () => {
    const gameState = createGameState(_createTestLevel());

    expect(gameState.solutions.map(solution => solution.isLocked)).toEqual([false, true, true]);
  });

  it('unlocks item-based and solution-based prerequisites when their requirements are met', () => {
    const gameState = createGameState(_createTestLevel());

    const afterItemUnlock = syncSolutionsWithUnlocks(gameState.solutions, new Set(['Book'])).solutions;
    expect(afterItemUnlock.map(solution => solution.isLocked)).toEqual([false, false, true]);

    afterItemUnlock[0] = { ...afterItemUnlock[0], isComplete:true };
    const afterSolutionUnlock = syncSolutionsWithUnlocks(afterItemUnlock, new Set(['Book'])).solutions;
    expect(afterSolutionUnlock.map(solution => solution.isLocked)).toEqual([false, false, false]);
  });
});

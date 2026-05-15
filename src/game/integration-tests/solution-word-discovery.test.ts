import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { createGameState, syncSolutionPhraseDiscovery } from '../gameUtil';
import { createItineraryIndex, createSpeechEvent } from '../itineraryUtil';
import { findRoom } from '../roomUtil';
import Level from '../types/Level';
import ClozePartType from '../solutions/types/ClozePartType';

function _createTestLevel():Level {
  const initialPosition = { x:5, y:5 };
  const itinerary = [createSpeechEvent(1_000, 'Ted entered room 206.', 0)];

  return {
    rooms:[{
      id:'Hall',
      title:'Throne Room',
      rect:{ x:0, y:0, width:10, height:10 },
      isObscured:false,
      items:[{
        id:'Book',
        title:'Book',
        displayChar:'B',
        position:{ x:6, y:5 },
        description:'Room 206 ledger.',
        isDiscovered:false
      }],
      obstructions:[],
      exits:[],
      waypoints:[{ position:initialPosition, adjacentWaypoints:[], exitDirections:{} }],
      positionMarkersById:{},
      isDiscovered:false
    }],
    initialCharacters:[{
      id:'Hero',
      title:'Lady Ted',
      faceImageUrl:null,
      randomSalt:0,
      isTitleKnown:true,
      description:'Room 206 witness.',
      items:[],
      x:initialPosition.x,
      y:initialPosition.y,
      waypoint:{ position:initialPosition, adjacentWaypoints:[], exitDirections:{} },
      facingAngle:0,
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    characters:[{
      id:'Hero',
      title:'Lady Ted',
      faceImageUrl:null,
      randomSalt:0,
      isTitleKnown:true,
      description:'Room 206 witness.',
      items:[],
      x:initialPosition.x,
      y:initialPosition.y,
      waypoint:{ position:initialPosition, adjacentWaypoints:[], exitDirections:{} },
      facingAngle:0,
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, initialPosition)
    }],
    solutions:[{
      id:'Mystery',
      title:'Mystery',
      parts:[{ type:ClozePartType.text, text:'Mystery' }],
      isComplete:false,
      isLocked:true,
      lockedRemainingPhrases:['ted', 'room 206', 'book', 'throne room']
    }],
    activeCharacterId:'Hero',
    startTime:1_000,
    duration:5_000,
    labels:[{ minutes:0, label:'midnight' }, { minutes:5 / 60, label:'12:05am' }]
  };
}

describe('solution phrase discovery integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('discovers character and item popover phrases from the current view', () => {
    const level = _createTestLevel();
    const gameState = createGameState(level);
    const hall = findRoom(gameState.rooms, 'Hall');

    hall.items.forEach(item => { item.isDiscovered = true; });
    gameState.hoveredCharacterId = 'Hero';
    syncSolutionPhraseDiscovery(gameState);
    expect(gameState.solutions[0].lockedRemainingPhrases).toEqual(['book']);

    gameState.hoveredCharacterId = null;
    gameState.hoveredItemId = 'Book';
    syncSolutionPhraseDiscovery(gameState);
    expect(gameState.solutions[0].lockedRemainingPhrases).toEqual([]);
    expect(gameState.solutions[0].isLocked).toBe(false);
  });

  it('counts playback speech but not scrub-only speech', () => {
    const level = _createTestLevel();
    const scrubState = createGameState(level);
    const playState = createGameState(level);

    syncSolutionPhraseDiscovery(scrubState, true);
    expect(scrubState.solutions[0].lockedRemainingPhrases).toEqual(['ted', 'room 206', 'book']);

    playState.isPlaying = true;
    syncSolutionPhraseDiscovery(playState, false);
    expect(playState.solutions[0].lockedRemainingPhrases).toEqual(['book']);
  });

  it('discovers room-title phrases when rooms become discovered', () => {
    const level = _createTestLevel();
    const gameState = createGameState(level);

    expect(gameState.solutions[0].lockedRemainingPhrases).toEqual(['ted', 'room 206', 'book']);
  });
});
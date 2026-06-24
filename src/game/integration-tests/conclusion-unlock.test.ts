// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { getCharacterCanvasRect } from '../drawing/characterDrawUtil';
import { canvasToGamePosition } from '../drawing/drawUtil';
import EffectType from '../effects/types/EffectType';
import { createGameState, updateAndDraw } from '../gameUtil';
import { updateGameStateForMouseMove } from '../hoverStateUtil';
import { createItineraryIndex, createSpeechEvent, createThoughtEvent } from '../itineraryUtil';
import { ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';
import { syncConclusionsWithUnlocks } from '../conclusions/conclusionDiscoveryUtil';
import { updateGameStateForChangeConclusions } from '../conclusionStateUtil';
import ClozePartType from '../conclusions/types/ClozePartType';
import { createDefaultConclusion } from '../conclusions/types/Conclusion';
import Itinerary from '../types/Itinerary';
import Level, { createDefaultLevel } from '../types/Level';
import { createDefaultCharacter } from '../types/Character';
import { createDefaultItem } from '../types/Item';
import { createDefaultRoom } from '../types/Room';
import PlayerEventType from '../types/playerEvents/PlayerEventType';
import { changeConclusions } from '../playerEventUtil';

function _createTestLevel():Level {
  const initialPosition = { x:5, y:5, z:ROOM_MIDDLE_ROW_CENTER_Z };
  const studyPosition = { x:15, y:5, z:ROOM_MIDDLE_ROW_CENTER_Z };
  const waypoint = { position:initialPosition, adjacentWaypoints:[], exitDirections:{} };
  const studyWaypoint = { position:studyPosition, adjacentWaypoints:[], exitDirections:{} };
  const heroItinerary:Itinerary = [];
  const witnessItinerary:Itinerary = [
    createSpeechEvent(0, 'I saw everything.'),
    createThoughtEvent(0, 'Should I tell them?')
  ];
  const bookItem = {
    ...createDefaultItem(),
    id:'book',
    title:'Book',
    position:{ x:6, y:5, z:ROOM_MIDDLE_ROW_CENTER_Z },
    description:'A test book.'
  };
  const noteItem = {
    ...createDefaultItem(),
    id:'note',
    title:'Note',
    position:{ x:16, y:5, z:ROOM_MIDDLE_ROW_CENTER_Z },
    description:'A hidden note.'
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
      isObscured:true,
      items:[noteItem],
      waypoints:[studyWaypoint]
    }],
    initialCharacters:[{
      ...createDefaultCharacter(),
      id:'hero',
      title:'Hero',
      description:'Test hero.',
      position:{ ...initialPosition },
      waypoint,
      itinerary:heroItinerary,
      itineraryIndex:createItineraryIndex(heroItinerary, initialPosition)
    }, {
      ...createDefaultCharacter(),
      id:'witness',
      title:'Witness',
      description:'Hidden witness.',
      position:{ ...studyPosition },
      waypoint:studyWaypoint,
      itinerary:witnessItinerary,
      itineraryIndex:createItineraryIndex(witnessItinerary, studyPosition)
    }],
    characters:[{
      ...createDefaultCharacter(),
      id:'hero',
      title:'Hero',
      description:'Test hero.',
      position:{ ...initialPosition },
      waypoint,
      itinerary:heroItinerary,
      itineraryIndex:createItineraryIndex(heroItinerary, initialPosition)
    }, {
      ...createDefaultCharacter(),
      id:'witness',
      title:'Witness',
      description:'Hidden witness.',
      position:{ ...studyPosition },
      waypoint:studyWaypoint,
      itinerary:witnessItinerary,
      itineraryIndex:createItineraryIndex(witnessItinerary, studyPosition)
    }],
    itemsById:new Map([['book', bookItem], ['note', noteItem]]),
    discoverableCharacterCount:2,
    discoverableItemCount:2,
    discoverableRoomCount:2,
    conclusions:[
      {
        ...createDefaultConclusion(),
        id:'open',
        title:'Open',
        parts:[{ type:ClozePartType.text, text:'Open' }],
        isLocked:false,
        unlockConclusionIds:['conclusion locked'],
        revealRoomIds:['study']
      },
      {
        ...createDefaultConclusion(),
        id:'conclusion locked',
        title:'Conclusion Locked',
        parts:[{ type:ClozePartType.text, text:'Conclusion Locked' }],
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

function _createHeldItemCharacterPopoverTestLevel():Level {
  const level = _createTestLevel();
  const bookItem = level.itemsById.get('book');
  expect(bookItem).toBeDefined();

  return {
    ...level,
    rooms:level.rooms.map(room => room.id === 'hall'
      ? { ...room, items:[] }
      : room),
    initialCharacters:level.initialCharacters.map(character => character.id === 'hero'
      ? { ...character, rightHandItem:bookItem!, items:[] }
      : character),
    characters:level.characters.map(character => character.id === 'hero'
      ? { ...character, rightHandItem:bookItem!, items:[] }
      : character)
  };
}

function _createBothHandsCharacterPopoverTestLevel():Level {
  const level = _createTestLevel();
  const bookItem = level.itemsById.get('book');
  const noteItem = level.itemsById.get('note');
  expect(bookItem).toBeDefined();
  expect(noteItem).toBeDefined();

  return {
    ...level,
    rooms:level.rooms.map(room => ({ ...room, items:[] })),
    initialCharacters:level.initialCharacters.map(character => character.id === 'hero'
      ? { ...character, leftHandItem:noteItem!, rightHandItem:bookItem!, items:[] }
      : character),
    characters:level.characters.map(character => character.id === 'hero'
      ? { ...character, leftHandItem:noteItem!, rightHandItem:bookItem!, items:[] }
      : character)
  };
}

function _createNonInteractiveHeldItemCharacterPopoverTestLevel():Level {
  const level = _createTestLevel();
  const bookItem = level.itemsById.get('book');
  expect(bookItem).toBeDefined();
  const nonInteractiveBook = { ...bookItem!, description:'' };

  return {
    ...level,
    rooms:level.rooms.map(room => room.id === 'hall'
      ? { ...room, items:[] }
      : room),
    itemsById:new Map([['book', nonInteractiveBook], ...Array.from(level.itemsById.entries()).filter(([id]) => id !== 'book')]),
    initialCharacters:level.initialCharacters.map(character => character.id === 'hero'
      ? { ...character, rightHandItem:nonInteractiveBook, items:[] }
      : character),
    characters:level.characters.map(character => character.id === 'hero'
      ? { ...character, rightHandItem:nonInteractiveBook, items:[] }
      : character)
  };
}

function _createHeldAndHiddenItemCharacterPopoverTestLevel():Level {
  const level = _createTestLevel();
  const bookItem = level.itemsById.get('book');
  const noteItem = level.itemsById.get('note');
  expect(bookItem).toBeDefined();
  expect(noteItem).toBeDefined();

  return {
    ...level,
    rooms:level.rooms.map(room => room.id === 'hall'
      ? { ...room, items:[] }
      : room),
    initialCharacters:level.initialCharacters.map(character => character.id === 'hero'
      ? { ...character, rightHandItem:bookItem!, items:[noteItem!] }
      : character),
    characters:level.characters.map(character => character.id === 'hero'
      ? { ...character, rightHandItem:bookItem!, items:[noteItem!] }
      : character)
  };
}

function _setTestScalingFactors(gameState:ReturnType<typeof createGameState>) {
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
}

function _hoverHero(gameState:ReturnType<typeof createGameState>) {
  const hero = gameState.characters.find(character => character.id === 'hero');
  expect(hero).toBeDefined();
  const heroRect = getCharacterCanvasRect(hero!, gameState.scalingFactors, gameState.time, gameState.imageSet);
  const [left, top] = canvasToGamePosition(heroRect.x, heroRect.y, gameState.scalingFactors);
  const [right, bottom] = canvasToGamePosition(heroRect.x + heroRect.width, heroRect.y + heroRect.height, gameState.scalingFactors);

  updateGameStateForMouseMove(gameState, {
    type:PlayerEventType.MOUSEMOVE,
    x:(left + right) / 2,
    y:(top + bottom) / 2
  });
}

describe('conclusion unlock integration', () => {
  it('preserves authored outgoing unlock edges and initial locked targets in the game state', () => {
    const gameState = createGameState(_createTestLevel());

    expect(gameState.conclusions.map(conclusion => conclusion.isLocked)).toEqual([false, true]);
    expect(gameState.conclusions[0].unlockConclusionIds).toEqual(['conclusion locked']);
    expect(gameState.conclusions[1].unlockConclusionIds).toEqual([]);
    expect(gameState.isLevelComplete).toBe(false);
    expect(gameState.winSynopsis).toBe('Solved it.');
  });

  it('unlocks conclusions listed by a completed conclusion', () => {
    const gameState = createGameState(_createTestLevel());

    const completedConclusions = gameState.conclusions.map(conclusion => conclusion.id === 'open'
      ? { ...conclusion, isComplete:true }
      : conclusion);
    const afterConclusionUnlock = syncConclusionsWithUnlocks(completedConclusions).conclusions;
    expect(afterConclusionUnlock.map(conclusion => conclusion.isLocked)).toEqual([false, false]);
  });

  it('marks the game state complete when all conclusions begin unlocked and complete', () => {
    const completeLevel = {
      ..._createTestLevel(),
      conclusions:_createTestLevel().conclusions.map(conclusion => ({ ...conclusion, isLocked:false, isComplete:true }))
    };

    expect(createGameState(completeLevel).isLevelComplete).toBe(true);
  });

  it('reveals rooms from completed conclusions and preserves that reveal across time rebuilds', () => {
    const gameState = createGameState(_createTestLevel());
    const studyBeforeReveal = gameState.rooms.find(room => room.id === 'study') || null;
    const initialStudyBeforeReveal = gameState.initialRooms.find(room => room.id === 'study') || null;

    expect(studyBeforeReveal?.isObscured).toBe(true);
    expect(initialStudyBeforeReveal?.isObscured).toBe(true);

    const nextConclusions = gameState.conclusions.map(conclusion => conclusion.id === 'open'
      ? { ...conclusion, isComplete:true }
      : conclusion);
    updateGameStateForChangeConclusions(gameState, { type:PlayerEventType.CHANGE_CONCLUSIONS, conclusions:nextConclusions });

    expect(gameState.rooms.find(room => room.id === 'study')?.isObscured).toBe(false);
    expect(gameState.initialRooms.find(room => room.id === 'study')?.isObscured).toBe(false);

    rebuildDynamicStateForTime(gameState, 1_000, 0);

    expect(gameState.rooms.find(room => room.id === 'study')?.isObscured).toBe(false);
  });

  it('reveals all discoverable rooms, characters, and items when the level becomes complete', () => {
    const gameState = createGameState(_createTestLevel());
    const nextConclusions = gameState.conclusions.map(conclusion => ({
      ...conclusion,
      isLocked:false,
      isComplete:true
    }));

    updateGameStateForChangeConclusions(gameState, { type:PlayerEventType.CHANGE_CONCLUSIONS, conclusions:nextConclusions });

    expect(gameState.isLevelComplete).toBe(true);
    expect(gameState.rooms.every(room => room.isDiscovered && !room.isObscured)).toBe(true);
    expect(gameState.initialRooms.every(room => room.isDiscovered && !room.isObscured)).toBe(true);
    expect(gameState.discoveredCharacterIds).toEqual(['hero', 'witness']);
    expect(gameState.discoveredItemIds).toEqual(['book', 'note']);
    expect(gameState.rooms.flatMap(room => room.items).every(item => item.isDiscovered)).toBe(true);
    expect(Array.from(gameState.initialItemsById.values()).every(item => item.isDiscovered)).toBe(true);

    rebuildDynamicStateForTime(gameState, 1_000, 0);

    expect(gameState.rooms.every(room => room.isDiscovered && !room.isObscured)).toBe(true);
    expect(gameState.discoveredCharacterIds).toEqual(['hero', 'witness']);
    expect(gameState.discoveredItemIds).toEqual(['book', 'note']);
  });

  it('notifies discoveries with fully revealed counts in the same frame that level completion is processed', () => {
    const gameState = createGameState(_createTestLevel());
    const context = _createMockContext();
    const nextConclusions = gameState.conclusions.map(conclusion => ({
      ...conclusion,
      isLocked:false,
      isComplete:true
    }));
    let notifiedDiscoveries:{ discoveredRoomCount:number, roomCount:number, characterCount:number, itemCount:number }|null = null;

    changeConclusions(nextConclusions);
    updateAndDraw(gameState, context, () => {}, undefined, undefined, undefined, false, discoveries => {
      notifiedDiscoveries = discoveries;
    });

    expect(gameState.isLevelComplete).toBe(true);
    expect(notifiedDiscoveries).toMatchObject({
      discoveredRoomCount:2,
      roomCount:2,
      characterCount:2,
      itemCount:2
    });
  });

  it('shows speech, talking, thought, and thinking effects for non-active rooms after level completion', () => {
    const gameState = createGameState(_createTestLevel());
    const drawnTexts:string[] = [];
    const context = _createMockContext(drawnTexts);
    const nextConclusions = gameState.conclusions.map(conclusion => ({
      ...conclusion,
      isLocked:false,
      isComplete:true
    }));

    updateGameStateForChangeConclusions(gameState, { type:PlayerEventType.CHANGE_CONCLUSIONS, conclusions:nextConclusions });
    gameState.isPlaying = true;
    gameState.realTimeToGameTimeOffset = gameState.time - Date.now();
    updateAndDraw(gameState, context, () => {});

    expect(drawnTexts).toContain('I saw everything.');
    expect(drawnTexts).toContain('Should I tell them?');
    expect(gameState.activeEffects.some(effect => effect.type === EffectType.TALKING && effect.character?.id === 'witness')).toBe(true);
    expect(gameState.activeEffects.some(effect => effect.type === EffectType.THINKING && effect.character?.id === 'witness')).toBe(true);
  });

  it('does not auto-discover visible characters or items before a popover is shown', () => {
    const gameState = createGameState(_createTestLevel());

    expect(gameState.discoveredCharacterIds).toEqual([]);
    expect(gameState.discoveredItemIds).toEqual([]);
    expect(gameState.characters[0]?.isDiscovered).toBe(false);
    expect(gameState.rooms[0].items[0]?.isDiscovered).toBe(false);
  });

  it('discovers a hovered visible item only when its popover is drawn, preserving discovery across time rebuilds', () => {
    const gameState = createGameState(_createTestLevel());
    const drawnTexts:string[] = [];
    const context = _createMockContext(drawnTexts);
    _setTestScalingFactors(gameState);
    gameState.rooms[0].items[0].description = 'A test book.|Second line.';

    const itemBeforeHover = gameState.rooms[0].items[0];
    expect(itemBeforeHover.isDiscovered).toBe(false);

    updateGameStateForMouseMove(gameState, { type:PlayerEventType.MOUSEMOVE, x:0, y:0 });

    const itemAfterHover = gameState.rooms[0].items[0];
    expect(itemAfterHover.isDiscovered).toBe(false);
    expect(gameState.viewedItemIds.has('Book')).toBe(true);

    updateAndDraw(gameState, context, () => {});

    expect(drawnTexts).toContain('Book');
    expect(drawnTexts).toContain('A test book.');
    expect(drawnTexts).toContain('Second line.');
    expect(gameState.rooms[0].items[0]?.isDiscovered).toBe(true);
    expect(gameState.discoveredItemIds).toEqual(['book']);

    rebuildDynamicStateForTime(gameState, 1_000, 0);

    const itemAfterRebuild = gameState.rooms[0].items[0];
    expect(itemAfterRebuild.isDiscovered).toBe(true);
  });

  it('discovers a hovered visible character only when its popover is drawn', () => {
    const gameState = createGameState(_createTestLevel());
    const context = _createMockContext();
    _setTestScalingFactors(gameState);
    _hoverHero(gameState);

    expect(gameState.hoveredCharacterId).toBe('hero');
    expect(gameState.characters[0]?.isDiscovered).toBe(false);
    expect(gameState.discoveredCharacterIds).toEqual([]);

    updateAndDraw(gameState, context, () => {});

    expect(gameState.characters[0]?.isDiscovered).toBe(true);
    expect(gameState.discoveredCharacterIds).toEqual(['hero']);
  });

  it('preserves discovered character state across time rebuilds', () => {
    const gameState = createGameState(_createTestLevel());
    const context = _createMockContext();
    _setTestScalingFactors(gameState);
    _hoverHero(gameState);

    updateAndDraw(gameState, context, () => {});
    rebuildDynamicStateForTime(gameState, 1_000, 0);

    expect(gameState.characters[0]?.isDiscovered).toBe(true);
    expect(gameState.discoveredCharacterIds).toEqual(['hero']);
  });

  it('includes held-item text in a character popover and discovers the held item when shown', () => {
    const gameState = createGameState(_createHeldItemCharacterPopoverTestLevel());
    const drawnTexts:string[] = [];
    const context = _createMockContext(drawnTexts);
    _setTestScalingFactors(gameState);
    gameState.characters[0].rightHandItem!.description = 'A test book.|Second line.';
    _hoverHero(gameState);

    expect(gameState.discoveredCharacterIds).toEqual([]);
    expect(gameState.discoveredItemIds).toEqual([]);

    updateAndDraw(gameState, context, () => {});

    expect(drawnTexts).toContain('Test hero.');
    expect(drawnTexts).toContain('Book (right hand)');
    expect(drawnTexts).toContain('A test book.');
    expect(drawnTexts).toContain('Second line.');
    expect(gameState.discoveredCharacterIds).toEqual(['hero']);
    expect(gameState.discoveredItemIds).toEqual(['book']);
  });

  it('includes both held items in a character popover and discovers both when shown', () => {
    const gameState = createGameState(_createBothHandsCharacterPopoverTestLevel());
    const drawnTexts:string[] = [];
    const context = _createMockContext(drawnTexts);
    _setTestScalingFactors(gameState);
    _hoverHero(gameState);

    updateAndDraw(gameState, context, () => {});

    expect(drawnTexts).toContain('Book (right hand)');
    expect(drawnTexts).toContain('A test book.');
    expect(drawnTexts).toContain('Note (left hand)');
    expect(drawnTexts).toContain('A hidden note.');
    expect(gameState.discoveredCharacterIds).toEqual(['hero']);
    expect(gameState.discoveredItemIds).toEqual(['book', 'note']);
  });

  it('shows hidden inventory summary after in-hand rows when other hidden items remain', () => {
    const gameState = createGameState(_createHeldAndHiddenItemCharacterPopoverTestLevel());
    const drawnTexts:string[] = [];
    const context = _createMockContext(drawnTexts);
    _setTestScalingFactors(gameState);
    _hoverHero(gameState);

    updateAndDraw(gameState, context, () => {});

    expect(drawnTexts).toContain('Book (right hand)');
    expect(drawnTexts).toContain('A test book.');
    expect(drawnTexts).toContain('Carrying 1 other hidden item.');
  });

  it('does not discover a non-interactive held item from a shown character popover', () => {
    const gameState = createGameState(_createNonInteractiveHeldItemCharacterPopoverTestLevel());
    const drawnTexts:string[] = [];
    const context = _createMockContext(drawnTexts);
    _setTestScalingFactors(gameState);
    _hoverHero(gameState);

    updateAndDraw(gameState, context, () => {});

    expect(drawnTexts).toContain('Book (right hand)');
    expect(gameState.discoveredCharacterIds).toEqual(['hero']);
    expect(gameState.discoveredItemIds).toEqual([]);
  });
});

function _createMockContext(drawnTexts:string[] = []):CanvasRenderingContext2D {
  return new Proxy({
    canvas:{ width:1280, height:720, style:{} },
    measureText:(text:string) => ({ width:text.length * 8, actualBoundingBoxAscent:0, actualBoundingBoxDescent:0 }),
    fillText:(text:string) => { drawnTexts.push(text); },
    strokeText:(text:string) => { drawnTexts.push(text); }
  } as unknown as CanvasRenderingContext2D, {
    get(target, property) {
      if (property in target) return (target as unknown as Record<PropertyKey, unknown>)[property];
      return () => {};
    },
    set(target, property, value) {
      (target as unknown as Record<PropertyKey, unknown>)[property] = value;
      return true;
    }
  });
}

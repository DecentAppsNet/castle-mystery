// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState, findCharacter } from '../gameUtil';
import { findCharacterPose } from '../itineraryUtil';
import { WAYPOINT_MIDDLE_ROW_Z } from '../waypointUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import giveItemLeftHandText from './fixtures/give-item-left-hand.md?raw';
import giveItemThenTakeRightHandSameTimestampNearNoApostropheText from './fixtures/give-item-then-take-right-hand-same-timestamp-near-no-apostrophe.md?raw';
import giveItemThenTakeRightHandSameTimestampNoApostropheText from './fixtures/give-item-then-take-right-hand-same-timestamp-no-apostrophe.md?raw';
import giveItemThenTakeRightHandSameTimestampText from './fixtures/give-item-then-take-right-hand-same-timestamp.md?raw';
import giveItemRightHandText from './fixtures/give-item-right-hand.md?raw';
import giveItemWalkText from './fixtures/give-item-walk.md?raw';

describe('give item integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('transfers the item from giver to recipient when the give event is reached', () => {
    const level = loadLevelFromText(giveItemWalkText);
    const king = level.characters.find(character => character.id === 'king');
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const beforeGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime - 1 });
    const atGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime });
    const beforeKing = findCharacter(beforeGiveState, 'King');
    const beforeQueen = findCharacter(beforeGiveState, 'Queen');
    const atGiveKing = findCharacter(atGiveState, 'King');
    const atGiveQueen = findCharacter(atGiveState, 'Queen');

    expect(giveEvent).toBeDefined();
    expect(beforeKing.items.map(item => item.id)).toContain('book');
    expect(beforeQueen.items.map(item => item.id)).not.toContain('book');
    expect(atGiveKing.items.map(item => item.id)).not.toContain('book');
    expect(atGiveQueen.items.map(item => item.id)).toContain('book');
  });

  it('stops at a different nearby waypoint than the recipient when movement is required', () => {
    const level = loadLevelFromText(giveItemWalkText);
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const lastWalkEvent = king?.itinerary.filter(event => event.type === ItineraryEventType.WALK).at(-1) as { toWaypointPosition?:{ x:number, y:number, z:number } } | undefined;

    expect(giveEvent).toBeDefined();
    expect(lastWalkEvent?.toWaypointPosition).toBeDefined();
    expect(lastWalkEvent?.toWaypointPosition?.z).toBe(WAYPOINT_MIDDLE_ROW_Z);
    expect(lastWalkEvent?.toWaypointPosition).not.toEqual(findCharacterPose(queen!, giveEvent!.startTime).position);
  });

  it('allows giving an item from the left hand', () => {
    const level = loadLevelFromText(giveItemLeftHandText);
    const king = level.characters.find(character => character.id === 'king');
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const beforeGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime - 1 });
    const atGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime });
    const beforeKing = findCharacter(beforeGiveState, 'King');
    const beforeQueen = findCharacter(beforeGiveState, 'Queen');
    const atGiveKing = findCharacter(atGiveState, 'King');
    const atGiveQueen = findCharacter(atGiveState, 'Queen');

    expect(beforeKing.leftHandItem?.id).toBe('book');
    expect(beforeKing.rightHandItem).toBeNull();
    expect(beforeKing.items).toEqual([]);
    expect(beforeQueen.items.map(item => item.id)).not.toContain('book');
    expect(atGiveKing.leftHandItem).toBeNull();
    expect(atGiveKing.rightHandItem).toBeNull();
    expect(atGiveKing.items).toEqual([]);
    expect(atGiveQueen.items.map(item => item.id)).toContain('book');
  });

  it('allows giving an item from the right hand', () => {
    const level = loadLevelFromText(giveItemRightHandText);
    const king = level.characters.find(character => character.id === 'king');
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const beforeGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime - 1 });
    const atGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime });
    const beforeKing = findCharacter(beforeGiveState, 'King');
    const beforeQueen = findCharacter(beforeGiveState, 'Queen');
    const atGiveKing = findCharacter(atGiveState, 'King');
    const atGiveQueen = findCharacter(atGiveState, 'Queen');

    expect(beforeKing.rightHandItem?.id).toBe('book');
    expect(beforeKing.leftHandItem).toBeNull();
    expect(beforeKing.items).toEqual([]);
    expect(beforeQueen.items.map(item => item.id)).not.toContain('book');
    expect(atGiveKing.rightHandItem).toBeNull();
    expect(atGiveKing.leftHandItem).toBeNull();
    expect(atGiveKing.items).toEqual([]);
    expect(atGiveQueen.items.map(item => item.id)).toContain('book');
  });

  it('places a just-given item into the recipient right hand when a same-timestamp take follows', () => {
    const level = loadLevelFromText(giveItemThenTakeRightHandSameTimestampText);
    const helena = level.characters.find(character => character.id === 'helena');
    const raniero = level.characters.find(character => character.id === 'raniero');
    const takeEvent = helena?.itinerary.find(event => event.type === ItineraryEventType.TAKE_ITEM) as { startTime:number } | undefined;
    const giveEvent = raniero?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const atTakeState = createGameState({ ...level, initialTime:takeEvent!.startTime });
    const atTakeHelena = findCharacter(atTakeState, 'Helena');

    expect(takeEvent).toBeDefined();
    expect(giveEvent).toBeDefined();
    expect(takeEvent?.startTime).toBe(giveEvent!.startTime + 1);
    expect(atTakeHelena.rightHandItem?.id).toBe('steward\'s key');
    expect(atTakeHelena.leftHandItem).toBeNull();
    expect(atTakeHelena.items).toEqual([]);
  });

  it('also places the item in hand without an apostrophe in the item name', () => {
    const level = loadLevelFromText(giveItemThenTakeRightHandSameTimestampNoApostropheText);
    const helena = level.characters.find(character => character.id === 'helena');
    const raniero = level.characters.find(character => character.id === 'raniero');
    const takeEvent = helena?.itinerary.find(event => event.type === ItineraryEventType.TAKE_ITEM) as { startTime:number } | undefined;
    const giveEvent = raniero?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const atTakeState = createGameState({ ...level, initialTime:takeEvent!.startTime });
    const atTakeHelena = findCharacter(atTakeState, 'Helena');

    expect(takeEvent).toBeDefined();
    expect(giveEvent).toBeDefined();
    expect(takeEvent?.startTime).toBe(giveEvent!.startTime + 1);
    expect(atTakeHelena.rightHandItem?.id).toBe('book');
    expect(atTakeHelena.leftHandItem).toBeNull();
    expect(atTakeHelena.items).toEqual([]);
  });

  it('works when the same Raniero/Helena give-then-take sequence starts nearby', () => {
    const level = loadLevelFromText(giveItemThenTakeRightHandSameTimestampNearNoApostropheText);
    const helena = level.characters.find(character => character.id === 'helena');
    const raniero = level.characters.find(character => character.id === 'raniero');
    const takeEvent = helena?.itinerary.find(event => event.type === ItineraryEventType.TAKE_ITEM) as { startTime:number } | undefined;
    const giveEvent = raniero?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const atTakeState = createGameState({ ...level, initialTime:takeEvent!.startTime });
    const atTakeHelena = findCharacter(atTakeState, 'Helena');

    expect(takeEvent).toBeDefined();
    expect(giveEvent).toBeDefined();
    expect(takeEvent?.startTime).toBe(5_001);
    expect(giveEvent?.startTime).toBe(5_000);
    expect(atTakeHelena.rightHandItem?.id).toBe('book');
    expect(atTakeHelena.leftHandItem).toBeNull();
    expect(atTakeHelena.items).toEqual([]);
  });
});

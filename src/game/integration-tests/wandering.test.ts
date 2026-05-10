import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { createGameStateFromLevel, findCharacter } from '../gameUtil';
import { loadLevelFromText } from '../levelUtil';
import wanderingDoubleText from './fixtures/wandering-double.md?raw';
import wanderingSingleText from './fixtures/wandering-single.md?raw';
import wanderingThroneRoomText from './fixtures/wandering-throne-room.md?raw';
import wanderingTrappedText from './fixtures/wandering-trapped.md?raw';
import wanderingUnclaimedText from './fixtures/wandering-unclaimed.md?raw';

function _createPositionSnapshot(levelText:string, time:number, characterId:string) {
  const level = loadLevelFromText(levelText);
  const gameState = createGameStateFromLevel({ ...level, startTime:time });
  const character = findCharacter(gameState, characterId);
  return { x:character.x, y:character.y };
}

function _findLoadedCharacter(levelText:string, characterId:string) {
  const level = loadLevelFromText(levelText);
  const character = level.characters.find(candidate => candidate.id === characterId) || null;
  expect(character).not.toBeNull();
  return character!;
}

describe('wandering integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('character moves from initial waypoint for a wander activity', () => {
    const hero = _findLoadedCharacter(wanderingSingleText, 'Hero');
    const wanderEvent = hero.itinerary[0];
    const initialPosition = _createPositionSnapshot(wanderingSingleText, 0, 'Hero');
    const endPosition = _createPositionSnapshot(wanderingSingleText, wanderEvent.startTime + wanderEvent.duration, 'Hero');

    expect(endPosition).not.toEqual(initialPosition);
  });

  it('character can wander in the throne-room layout from kingacide', () => {
    expect(() => loadLevelFromText(wanderingThroneRoomText)).not.toThrow();

    const king = _findLoadedCharacter(wanderingThroneRoomText, 'King');
    const wanderEvent = king.itinerary[0];
    const initialPosition = _createPositionSnapshot(wanderingThroneRoomText, 0, 'King');
    const endPosition = _createPositionSnapshot(wanderingThroneRoomText, wanderEvent.startTime + wanderEvent.duration, 'King');

    expect(endPosition).not.toEqual(initialPosition);
  });

  it('character moves two times for two wander activities', () => {
    const hero = _findLoadedCharacter(wanderingDoubleText, 'Hero');
    expect(hero.itinerary).toHaveLength(2);

    const firstEvent = hero.itinerary[0];
    const secondEvent = hero.itinerary[1];
    const initialPosition = _createPositionSnapshot(wanderingDoubleText, 0, 'Hero');
    const firstEndPosition = _createPositionSnapshot(wanderingDoubleText, firstEvent.startTime + firstEvent.duration, 'Hero');
    const secondEndPosition = _createPositionSnapshot(wanderingDoubleText, secondEvent.startTime + secondEvent.duration, 'Hero');

    expect(firstEndPosition).not.toEqual(initialPosition);
    expect(secondEndPosition).not.toEqual(firstEndPosition);
  });

  it('character moves to an unclaimed waypoint for a wander activity', () => {
    const hero = _findLoadedCharacter(wanderingUnclaimedText, 'Hero');
    const wanderEvent = hero.itinerary[0];
    const heroInitialPosition = _createPositionSnapshot(wanderingUnclaimedText, 0, 'Hero');
    const guardPositionAtWanderStart = _createPositionSnapshot(wanderingUnclaimedText, wanderEvent.startTime, 'Guard');
    const heroEndPosition = _createPositionSnapshot(wanderingUnclaimedText, wanderEvent.startTime + wanderEvent.duration, 'Hero');

    expect(Math.hypot(guardPositionAtWanderStart.x - heroInitialPosition.x, guardPositionAtWanderStart.y - heroInitialPosition.y))
      .toBeLessThanOrEqual(Math.hypot(5, 5));
    expect(heroEndPosition).not.toEqual(guardPositionAtWanderStart);
  });

  it('throws while loading when a room has no connected waypoints', () => {
    expect(() => loadLevelFromText(wanderingTrappedText)).toThrow(/no connected waypoints/i);
  });
});

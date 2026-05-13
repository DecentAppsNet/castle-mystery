import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { createGameState, findCharacter } from '../gameUtil';
import { loadLevelFromText } from '../levelUtil';
import interleavedAfterPreviousActivityText from './fixtures/after-previous-activity-interleaved-characters.md?raw';
import wanderingDoubleText from './fixtures/wandering-double.md?raw';
import wanderingSingleText from './fixtures/wandering-single.md?raw';
import wanderingThroneRoomText from './fixtures/wandering-throne-room.md?raw';
import wanderingTrappedText from './fixtures/wandering-trapped.md?raw';
import wanderingUnclaimedText from './fixtures/wandering-unclaimed.md?raw';

function _findWalkEvents(levelText:string, characterId:string) {
  const character = _findLoadedCharacter(levelText, characterId);
  return character.itinerary.filter(event => event.type === 'Walk');
}

function _createPositionSnapshot(levelText:string, time:number, characterId:string) {
  const level = loadLevelFromText(levelText);
  const gameState = createGameState({ ...level, startTime:time });
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
    const [wanderEvent] = _findWalkEvents(wanderingSingleText, 'Hero');
    const initialPosition = _createPositionSnapshot(wanderingSingleText, 0, 'Hero');
    const endPosition = _createPositionSnapshot(wanderingSingleText, wanderEvent.startTime + wanderEvent.duration, 'Hero');

    expect(endPosition).not.toEqual(initialPosition);
  });

  it('character can wander in the throne-room layout from kingacide', () => {
    expect(() => loadLevelFromText(wanderingThroneRoomText)).not.toThrow();

    const [wanderEvent] = _findWalkEvents(wanderingThroneRoomText, 'King');
    const initialPosition = _createPositionSnapshot(wanderingThroneRoomText, 0, 'King');
    const endPosition = _createPositionSnapshot(wanderingThroneRoomText, wanderEvent.startTime + wanderEvent.duration, 'King');

    expect(endPosition).not.toEqual(initialPosition);
  });

  it('character moves two times for two wander activities', () => {
    const walkEvents = _findWalkEvents(wanderingDoubleText, 'Hero');
    expect(walkEvents).toHaveLength(2);

    const [firstEvent, secondEvent] = walkEvents;
    const initialPosition = _createPositionSnapshot(wanderingDoubleText, 0, 'Hero');
    const firstEndPosition = _createPositionSnapshot(wanderingDoubleText, firstEvent.startTime + firstEvent.duration, 'Hero');
    const secondEndPosition = _createPositionSnapshot(wanderingDoubleText, secondEvent.startTime + secondEvent.duration, 'Hero');

    expect(firstEndPosition).not.toEqual(initialPosition);
    expect(secondEndPosition).not.toEqual(firstEndPosition);
  });

  it('character moves to an unclaimed waypoint for a wander activity', () => {
    const [wanderEvent] = _findWalkEvents(wanderingUnclaimedText, 'Hero');
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

  it('resolves after-previous-activity timestamps from the previous file activity when activities are interleaved', () => {
    const level = loadLevelFromText(interleavedAfterPreviousActivityText);
    const king = level.characters.find(character => character.id === 'King');
    const jester = level.characters.find(character => character.id === 'Jester');
    const kingOpeningSpeechEvent = king?.itinerary.find(event => event.type === 'Speech');
    const jesterSpeechEvent = jester?.itinerary.find(event => event.type === 'Speech');
    const kingSpeechEvent = king?.itinerary.findLast(event => event.type === 'Speech');

    expect(() => loadLevelFromText(interleavedAfterPreviousActivityText)).not.toThrow();
    expect(kingOpeningSpeechEvent).toBeDefined();
    expect(jesterSpeechEvent).toBeDefined();
    expect(kingSpeechEvent).toBeDefined();
    expect(jesterSpeechEvent!.startTime).toBeGreaterThanOrEqual(kingOpeningSpeechEvent!.startTime + kingOpeningSpeechEvent!.duration);
    expect(kingSpeechEvent!.startTime).toBeGreaterThanOrEqual(jesterSpeechEvent!.startTime + jesterSpeechEvent!.duration);
  });
});

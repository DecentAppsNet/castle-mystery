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

async function _findWalkEvents(levelText:string, characterId:string) {
  const character = await _findLoadedCharacter(levelText, characterId);
  return character.itinerary.filter(event => event.type === 'Walk');
}

async function _createPositionSnapshot(levelText:string, time:number, characterId:string) {
  const level = await loadLevelFromText(levelText);
  const gameState = createGameState({ ...level, startTime:time });
  const character = findCharacter(gameState, characterId);
  return { x:character.x, y:character.y };
}

async function _findLoadedCharacter(levelText:string, characterId:string) {
  const level = await loadLevelFromText(levelText);
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

  it('character moves from initial waypoint for a wander activity', async () => {
    const [wanderEvent] = await _findWalkEvents(wanderingSingleText, 'Hero');
    const initialPosition = await _createPositionSnapshot(wanderingSingleText, 0, 'Hero');
    const endPosition = await _createPositionSnapshot(wanderingSingleText, wanderEvent.startTime + wanderEvent.duration, 'Hero');

    expect(endPosition).not.toEqual(initialPosition);
  });

  it('character can wander in the throne-room layout from kingacide', async () => {
    expect(() => loadLevelFromText(wanderingThroneRoomText)).not.toThrow();

    const [wanderEvent] = await _findWalkEvents(wanderingThroneRoomText, 'King');
    const initialPosition = await _createPositionSnapshot(wanderingThroneRoomText, 0, 'King');
    const endPosition = await _createPositionSnapshot(wanderingThroneRoomText, wanderEvent.startTime + wanderEvent.duration, 'King');

    expect(endPosition).not.toEqual(initialPosition);
  });

  it('character moves two times for two wander activities', async () => {
    const walkEvents = await _findWalkEvents(wanderingDoubleText, 'Hero');
    expect(walkEvents).toHaveLength(2);

    const [firstEvent, secondEvent] = walkEvents;
    const initialPosition = await _createPositionSnapshot(wanderingDoubleText, 0, 'Hero');
    const firstEndPosition = await _createPositionSnapshot(wanderingDoubleText, firstEvent.startTime + firstEvent.duration, 'Hero');
    const secondEndPosition = await _createPositionSnapshot(wanderingDoubleText, secondEvent.startTime + secondEvent.duration, 'Hero');

    expect(firstEndPosition).not.toEqual(initialPosition);
    expect(secondEndPosition).not.toEqual(firstEndPosition);
  });

  it('character moves to an unclaimed waypoint for a wander activity', async () => {
    const [wanderEvent] = await _findWalkEvents(wanderingUnclaimedText, 'Hero');
    const heroInitialPosition = await _createPositionSnapshot(wanderingUnclaimedText, 0, 'Hero');
    const guardPositionAtWanderStart = await _createPositionSnapshot(wanderingUnclaimedText, wanderEvent.startTime, 'Guard');
    const heroEndPosition = await _createPositionSnapshot(wanderingUnclaimedText, wanderEvent.startTime + wanderEvent.duration, 'Hero');

    expect(Math.hypot(guardPositionAtWanderStart.x - heroInitialPosition.x, guardPositionAtWanderStart.y - heroInitialPosition.y))
      .toBeLessThanOrEqual(Math.hypot(5, 5));
    expect(heroEndPosition).not.toEqual(guardPositionAtWanderStart);
  });

  it('throws while loading when a room has no connected waypoints', async () => {
    expect(() => loadLevelFromText(wanderingTrappedText)).toThrow(/no connected waypoints/i);
  });

  it('resolves after-previous-activity timestamps from the previous file activity when activities are interleaved', async () => {
    const level = await loadLevelFromText(interleavedAfterPreviousActivityText);
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

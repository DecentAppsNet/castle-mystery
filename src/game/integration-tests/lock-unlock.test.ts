// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import LockChangeEffect from '../effects/types/LockChangeEffect';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { createGameState, findCharacter } from '../gameUtil';
import { findExitWaypoint, findRoom, findRoomAtPosition } from '../roomUtil';
import ExitStatus from '../types/ExitStatus';
import EffectType from '../effects/types/EffectType';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import WalkEvent from '../types/itineraryEvents/WalkEvent';
import lockUnlockActivityText from '../__tests__/fixtures/lock-unlock-activity.md?raw';
import unlockAfterMoveText from './fixtures/unlock-after-move.md?raw';

function _findCellExit(levelLike:{ rooms:{ id:string, exits:{ room1Id:string, room2Id:string, exitStatus:ExitStatus }[] }[] }) {
  const cell = findRoom(levelLike.rooms as Parameters<typeof findRoom>[0], 'Cell');
  const exit = cell.exits.find(candidate => candidate.room1Id === 'second cell' || candidate.room2Id === 'second cell') || null;
  expect(exit).not.toBeNull();
  return exit!;
}

function _expectWalkThenExitStateChange(levelText:string, eventType:ItineraryEventType.LOCK|ItineraryEventType.UNLOCK,
  beforeStatus:ExitStatus, afterStatus:ExitStatus, minimumWalkStartTime:number = 0) {
  const level = loadLevelFromText(levelText);
  const keeper = level.characters.find(character => character.id === 'keeper');
  const lockChangeEvent = keeper?.itinerary.find(event => event.type === eventType) as { startTime:number } | undefined;
  const preChangeWalkEvents = keeper?.itinerary.filter(event =>
    event.type === ItineraryEventType.WALK
    && event.startTime >= minimumWalkStartTime
    && event.startTime < (lockChangeEvent?.startTime ?? Number.NEGATIVE_INFINITY)) as WalkEvent[] | undefined;
  const lastWalkEvent = preChangeWalkEvents?.[preChangeWalkEvents.length - 1];
  const beforeChangeState = createGameState({ ...level, startTime:lockChangeEvent!.startTime - 1 });
  const atChangeState = createGameState({ ...level, startTime:lockChangeEvent!.startTime });
  const cell = findRoom(level.rooms, 'Cell');
  const cellExit = cell.exits.find(candidate => candidate.room1Id === 'second cell' || candidate.room2Id === 'second cell');
  const exitWaypoint = findExitWaypoint(cell.id, cell.rect, cellExit!, cell.waypoints);
  const beforeChangeKeeper = findCharacter(beforeChangeState, 'Keeper');
  const atChangeKeeper = findCharacter(atChangeState, 'Keeper');

  expect(lockChangeEvent).toBeDefined();
  expect(lastWalkEvent).toBeDefined();
  expect(lastWalkEvent!.startTime + lastWalkEvent!.duration).toBe(lockChangeEvent!.startTime);
  expect(_findCellExit(beforeChangeState).exitStatus).toBe(beforeStatus);
  expect(_findCellExit(atChangeState).exitStatus).toBe(afterStatus);
  expect({ x:beforeChangeKeeper.x, y:beforeChangeKeeper.y }).not.toEqual(exitWaypoint.position);
  expect({ x:atChangeKeeper.x, y:atChangeKeeper.y }).toEqual(exitWaypoint.position);
}

describe('lock unlock integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('rebuilds lock and unlock events into runtime exit status changes', () => {
    const level = loadLevelFromText(lockUnlockActivityText);
    const gameState = createGameState(level);
    const keeper = gameState.characters.find(character => character.id === 'keeper');
    const lockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.LOCK) as { startTime:number, roomExitId:string } | undefined;
    const unlockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.UNLOCK) as { startTime:number, roomExitId:string } | undefined;
    const initialExit = _findCellExit(gameState);

    expect(lockEvent).toBeDefined();
    expect(unlockEvent).toBeDefined();
    expect(lockEvent?.roomExitId).toBe(initialExit.id);
    expect(unlockEvent?.roomExitId).toBe(initialExit.id);
    expect(initialExit.exitStatus).toBe(ExitStatus.unlocked);

    rebuildDynamicStateForTime(gameState, lockEvent!.startTime - 1);
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.unlocked);

    rebuildDynamicStateForTime(gameState, lockEvent!.startTime, lockEvent!.startTime - 1);
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.locked);

    rebuildDynamicStateForTime(gameState, unlockEvent!.startTime, lockEvent!.startTime);
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.unlocked);
  });

  it('rebuilds the same exit status correctly when scrubbing backward and forward across lock changes', () => {
    const level = loadLevelFromText(lockUnlockActivityText);
    const gameState = createGameState(level);
    const keeper = gameState.characters.find(character => character.id === 'keeper');
    const lockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.LOCK) as { startTime:number } | undefined;
    const unlockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.UNLOCK) as { startTime:number } | undefined;

    expect(lockEvent).toBeDefined();
    expect(unlockEvent).toBeDefined();
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.unlocked);

    rebuildDynamicStateForTime(gameState, lockEvent!.startTime, 0);
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.locked);

    rebuildDynamicStateForTime(gameState, unlockEvent!.startTime, lockEvent!.startTime);
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.unlocked);

    rebuildDynamicStateForTime(gameState, lockEvent!.startTime - 1, unlockEvent!.startTime);
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.unlocked);

    rebuildDynamicStateForTime(gameState, lockEvent!.startTime, lockEvent!.startTime - 1);
    expect(_findCellExit(gameState).exitStatus).toBe(ExitStatus.locked);
  });

  it('creates lock and unlock room effects during playback but not scrubbing', () => {
    const level = loadLevelFromText(lockUnlockActivityText);
    const gameState = createGameState(level);
    const keeper = gameState.characters.find(character => character.id === 'keeper');
    const lockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.LOCK) as { startTime:number } | undefined;

    rebuildDynamicStateForTime(gameState, lockEvent!.startTime);
    expect(gameState.activeEffects.some(effect => effect.type === EffectType.LOCK || effect.type === EffectType.UNLOCK)).toBe(false);

    rebuildDynamicStateForTime(gameState, lockEvent!.startTime, lockEvent!.startTime - 1);
    expect(gameState.activeEffects.some(effect => effect.type === EffectType.LOCK)).toBe(true);
  });

  it('anchors unlock effects to the event start room after movement', () => {
    const level = loadLevelFromText(unlockAfterMoveText);
    const keeper = level.characters.find(character => character.id === 'keeper');
    const unlockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.UNLOCK) as { startTime:number } | undefined;
    const unlockEventIndex = keeper?.itinerary.findIndex(event => event.type === ItineraryEventType.UNLOCK) ?? -1;
    const unlockStartPosition = unlockEventIndex >= 0 ? keeper?.itineraryIndex.eventStartPositions[unlockEventIndex] : null;
    const expectedRoom = unlockStartPosition ? findRoomAtPosition(level.rooms, unlockStartPosition.x, unlockStartPosition.y) : null;
    const gameState = createGameState({ ...level, activeCharacterId:'Keeper' });

    expect(unlockEvent).toBeDefined();
    expect(unlockStartPosition).toBeDefined();
    expect(expectedRoom).not.toBeNull();

    rebuildDynamicStateForTime(gameState, unlockEvent!.startTime, unlockEvent!.startTime - 1);
    const unlockEffect = gameState.activeEffects.find(effect => effect.type === EffectType.UNLOCK) as LockChangeEffect | undefined;

    expect(unlockEffect).toBeDefined();
    expect(unlockEffect?.room?.id).toBe(expectedRoom!.id);
  });

  it('walks to the exit waypoint before the lock event changes exit state', () => {
    _expectWalkThenExitStateChange(lockUnlockActivityText, ItineraryEventType.LOCK, ExitStatus.unlocked, ExitStatus.locked);
  });

  it('walks to the exit waypoint before the unlock event changes exit state', () => {
    _expectWalkThenExitStateChange(unlockAfterMoveText, ItineraryEventType.UNLOCK, ExitStatus.locked, ExitStatus.unlocked, 10_000);
  });
});
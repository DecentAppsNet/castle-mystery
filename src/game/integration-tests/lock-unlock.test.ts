import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { createGameState, findCharacter } from '../gameUtil';
import { loadLevelFromText } from '../levelLoading/levelUtil';
import { findExitWaypoint, findRoom } from '../roomUtil';
import ExitStatus from '../types/ExitStatus';
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

  it('walks to the exit waypoint before the lock event changes exit state', () => {
    const level = loadLevelFromText(lockUnlockActivityText);
    const keeper = level.characters.find(character => character.id === 'keeper');
    const lockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.LOCK) as { startTime:number } | undefined;
    const lockWalkEvents = keeper?.itinerary.filter(event =>
      event.type === ItineraryEventType.WALK && event.startTime < (lockEvent?.startTime ?? Number.NEGATIVE_INFINITY)) as WalkEvent[] | undefined;
    const lastWalkEvent = lockWalkEvents?.[lockWalkEvents.length - 1];
    const beforeLockState = createGameState({ ...level, startTime:lockEvent!.startTime - 1 });
    const atLockState = createGameState({ ...level, startTime:lockEvent!.startTime });
    const cell = findRoom(level.rooms, 'Cell');
    const cellExit = cell.exits.find(candidate => candidate.room1Id === 'second cell' || candidate.room2Id === 'second cell');
    const exitWaypoint = findExitWaypoint(cell.id, cell.rect, cellExit!, cell.waypoints);
    const beforeLockKeeper = findCharacter(beforeLockState, 'Keeper');
    const atLockKeeper = findCharacter(atLockState, 'Keeper');

    expect(lockEvent).toBeDefined();
    expect(lastWalkEvent).toBeDefined();
    expect(lastWalkEvent!.startTime + lastWalkEvent!.duration).toBe(lockEvent!.startTime);
    expect(_findCellExit(beforeLockState).exitStatus).toBe(ExitStatus.unlocked);
    expect(_findCellExit(atLockState).exitStatus).toBe(ExitStatus.locked);
    expect(beforeLockKeeper.x).not.toBe(exitWaypoint.position.x);
    expect(beforeLockKeeper.y).not.toBe(exitWaypoint.position.y);
    expect({ x:atLockKeeper.x, y:atLockKeeper.y }).toEqual(exitWaypoint.position);
  });

  it('walks to the exit waypoint before the unlock event changes exit state', () => {
    const level = loadLevelFromText(unlockAfterMoveText);
    const keeper = level.characters.find(character => character.id === 'keeper');
    const unlockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.UNLOCK) as { startTime:number } | undefined;
    const unlockWalkEvents = keeper?.itinerary.filter(event =>
      event.type === ItineraryEventType.WALK
      && event.startTime >= 10_000
      && event.startTime < (unlockEvent?.startTime ?? Number.NEGATIVE_INFINITY)) as WalkEvent[] | undefined;
    const lastWalkEvent = unlockWalkEvents?.[unlockWalkEvents.length - 1];
    const beforeUnlockState = createGameState({ ...level, startTime:unlockEvent!.startTime - 1 });
    const atUnlockState = createGameState({ ...level, startTime:unlockEvent!.startTime });
    const cell = findRoom(level.rooms, 'Cell');
    const cellExit = cell.exits.find(candidate => candidate.room1Id === 'second cell' || candidate.room2Id === 'second cell');
    const exitWaypoint = findExitWaypoint(cell.id, cell.rect, cellExit!, cell.waypoints);
    const beforeUnlockKeeper = findCharacter(beforeUnlockState, 'Keeper');
    const atUnlockKeeper = findCharacter(atUnlockState, 'Keeper');

    expect(unlockEvent).toBeDefined();
    expect(lastWalkEvent).toBeDefined();
    expect(lastWalkEvent!.startTime + lastWalkEvent!.duration).toBe(unlockEvent!.startTime);
    expect(_findCellExit(beforeUnlockState).exitStatus).toBe(ExitStatus.locked);
    expect(_findCellExit(atUnlockState).exitStatus).toBe(ExitStatus.unlocked);
    expect({ x:beforeUnlockKeeper.x, y:beforeUnlockKeeper.y }).not.toEqual(exitWaypoint.position);
    expect({ x:atUnlockKeeper.x, y:atUnlockKeeper.y }).toEqual(exitWaypoint.position);
  });
});
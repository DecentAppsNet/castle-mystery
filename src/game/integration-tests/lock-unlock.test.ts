import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { createGameState } from '../gameUtil';
import { loadLevelFromText } from '../levelLoading/levelUtil';
import { findRoom } from '../roomUtil';
import ExitStatus from '../types/ExitStatus';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import lockUnlockActivityText from '../__tests__/fixtures/lock-unlock-activity.md?raw';

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
});
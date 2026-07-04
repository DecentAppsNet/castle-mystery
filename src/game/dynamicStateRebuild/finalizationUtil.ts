/* This module groups end-of-rebuild finalization helpers used during dynamic-state rebuild, meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { findActiveCharacter } from "../activeCharacterUtil";
import { findRoomAtPosition } from "../roomUtil";
import GameState from "../types/GameState";
import { DiscoveryStateSnapshot, restoreDiscoveryState } from "./discoveryStateUtil";
import { PendingRoomEffect } from "./exitStateApplicationUtil";

// Emit room effects only for the active room after pose and focus resolution.
function _emitActiveRoomEffects(gameState:GameState, pendingRoomEffects:PendingRoomEffect[]) {
  const activeCharacter = findActiveCharacter(gameState);
  assertNonNullable(activeCharacter);
  const activeRoom = findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y);
  assertNonNullable(activeRoom);
  pendingRoomEffects
    .filter(effect => effect.roomId === activeRoom.id)
    .forEach(effect => effect.create());
}

// Finish rebuild by emitting active-room effects, restoring durable discovery state, and storing the rebuilt time.
export function finalizeDynamicStateRebuild(gameState:GameState, time:number, pendingRoomEffects:PendingRoomEffect[],
  discoveryStateSnapshot:DiscoveryStateSnapshot) {
  _emitActiveRoomEffects(gameState, pendingRoomEffects);
  restoreDiscoveryState(gameState, discoveryStateSnapshot);
  gameState.time = time;
}
/* This module groups exit-state replay helpers used during dynamic-state rebuild, meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createLockEffect, createUnlockEffect } from "../effects/lockEffectUtil";
import { findRoomAtPosition } from "../roomUtil";
import ExitStatus from "../types/ExitStatus";
import GameState from "../types/GameState";
import ItineraryEventType from "../types/itineraryEvents/ItineraryEventType";
import LockEvent from "../types/itineraryEvents/LockEvent";
import UnlockEvent from "../types/itineraryEvents/UnlockEvent";
import Position, { duplicatePosition } from "../types/Position";
import { findReplayCharacters, isReplayEventActiveForCharacter } from "./replayCharacterUtil";

export type PendingRoomEffect = {
  roomId:string,
  create:() => void
}

type AppliedExitStateEvent = {
  characterId:string,
  eventIndex:number,
  startPosition:Position,
  event:LockEvent|UnlockEvent
}

// Gather and sort exit-lock state changes that should already have happened by the target time.
function _collectAppliedExitStateEvents(gameState:GameState, time:number):AppliedExitStateEvent[] {
  const appliedEvents:AppliedExitStateEvent[] = [];
  findReplayCharacters(gameState).forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      if (!isReplayEventActiveForCharacter(gameState, character, event.startTime)) return;
      switch(event.type) {
        case ItineraryEventType.LOCK:
        case ItineraryEventType.UNLOCK:
          {
            const startPosition = character.itineraryIndex.eventStartPositions[eventIndex];
            assertNonNullable(startPosition);
            appliedEvents.push({
              characterId:character.id,
              eventIndex,
              startPosition:duplicatePosition(startPosition),
              event:event as LockEvent|UnlockEvent
            });
          }
        break;
      }
    });
  });
  appliedEvents.sort((a, b) => a.event.startTime - b.event.startTime || a.characterId.localeCompare(b.characterId) || a.eventIndex - b.eventIndex);
  return appliedEvents;
}

// Update every copy of an exit with the new shared status.
function _setMatchingExitStatus(gameState:GameState, roomExitId:string, exitStatus:ExitStatus) {
  let didFindMatch = false;
  gameState.rooms.forEach(room => {
    room.exits.forEach(candidate => {
      if (candidate.id !== roomExitId) return;
      candidate.exitStatus = exitStatus;
      didFindMatch = true;
    });
  });
  assertNonNullable(didFindMatch ? roomExitId : null, `unable to find rebuilt exit ${roomExitId}`);
}

// Find one exit instance by id within a single room snapshot.
function _findRoomExitById(room:GameState['rooms'][number], roomExitId:string) {
  return room.exits.find(candidate => candidate.id === roomExitId) || null;
}

// Replay exit lock and unlock events into runtime state and enqueue any visible room effects.
export function applyExitState(gameState:GameState, time:number, previousTime:number|undefined, metaTime:number,
  pendingRoomEffects:PendingRoomEffect[]) {
  _collectAppliedExitStateEvents(gameState, time).forEach(({ startPosition, event }) => {
    const room = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
    const roomExit = room ? _findRoomExitById(room, event.roomExitId) : null;
    switch(event.type) {
      case ItineraryEventType.LOCK:
        _setMatchingExitStatus(gameState, event.roomExitId, ExitStatus.locked);
        if (room && roomExit && previousTime !== undefined && event.startTime > previousTime && event.startTime <= time && !room.isObscured) {
          pendingRoomEffects.push({ roomId:room.id, create:() => gameState.activeEffects.push(createLockEffect(room, roomExit, metaTime, gameState.scalingFactors, gameState.imageSet)) });
        }
      break;

      case ItineraryEventType.UNLOCK:
        _setMatchingExitStatus(gameState, event.roomExitId, ExitStatus.unlocked);
        if (room && roomExit && previousTime !== undefined && event.startTime > previousTime && event.startTime <= time && !room.isObscured) {
          pendingRoomEffects.push({ roomId:room.id, create:() => gameState.activeEffects.push(createUnlockEffect(room, roomExit, metaTime, gameState.scalingFactors, gameState.imageSet)) });
        }
      break;
    }
  });
}
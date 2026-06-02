/* This module groups outward notification helpers that translate mutable game-state changes into throttled UI callbacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { msecsToMinutes } from "@/homeScreen/interactions/gameplay";

import Solution, { duplicateSolution } from "./solutions/types/Solution";
import GameState from "./types/GameState";

const UPDATE_MINUTES_REAL_TIME_INTERVAL = 200;

export function callOnMinutesChangedAsNeeded(gameState:GameState, onMinutesChanged:(minutes:number) => void) {
  const nextMinutes = msecsToMinutes(gameState.time);
  const now = Date.now();
  const isSameMinutesValue = nextMinutes === gameState.lastMinutesChangedValue;
  const isThrottleIntervalElapsed = now - gameState.lastMinutesChangedCallRealTime >= UPDATE_MINUTES_REAL_TIME_INTERVAL;
  if (isSameMinutesValue || !isThrottleIntervalElapsed) return;
  gameState.lastMinutesChangedCallRealTime = now;
  gameState.lastMinutesChangedValue = nextMinutes;
  onMinutesChanged(nextMinutes);
}

export function callOnActiveCharacterChangedAsNeeded(gameState:GameState, onActiveCharacterChanged:(characterId:string) => void) {
  const activeCharacterId = gameState.characters[gameState.activeCharacterI]?.id || "";
  if (activeCharacterId === gameState.lastActiveCharacterChangedValue) return;
  gameState.lastActiveCharacterChangedValue = activeCharacterId;
  onActiveCharacterChanged(activeCharacterId);
}

export function callOnSolutionsChangedAsNeeded(gameState:GameState, onSolutionsChanged:(solutions:Solution[]) => void) {
  if (gameState.solutionsRevision === gameState.lastNotifiedSolutionsRevision) return;
  gameState.lastNotifiedSolutionsRevision = gameState.solutionsRevision;
  onSolutionsChanged(gameState.solutions.map(duplicateSolution));
}
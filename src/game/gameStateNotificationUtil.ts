/* This module groups outward notification helpers that translate mutable game-state changes into throttled UI callbacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { msecsToMinutes } from "@/homeScreen/interactions/gameplay";

import { createDiscoveries } from "./discoveriesUtil";
import Conclusion, { duplicateConclusion } from "./conclusions/types/Conclusion";
import Discoveries from "./types/Discoveries";
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
  if (gameState.activeCharacterId === gameState.lastActiveCharacterChangedValue) return;
  gameState.lastActiveCharacterChangedValue = gameState.activeCharacterId;
  onActiveCharacterChanged(gameState.activeCharacterId);
}

export function callOnConclusionsChangedAsNeeded(gameState:GameState, onConclusionsChanged:(conclusions:Conclusion[]) => void) {
  if (gameState.conclusionsRevision === gameState.lastNotifiedConclusionsRevision) return;
  gameState.lastNotifiedConclusionsRevision = gameState.conclusionsRevision;
  onConclusionsChanged(gameState.conclusions.map(duplicateConclusion));
}

export function callOnDiscoveriesChangedAsNeeded(gameState:GameState, onDiscoveriesChanged:(discoveries:Discoveries) => void) {
  const discoveries = createDiscoveries(gameState);
  const discoveriesKey = JSON.stringify(discoveries);
  if (discoveriesKey === gameState.lastNotifiedDiscoveriesKey) return;
  gameState.lastNotifiedDiscoveriesKey = discoveriesKey;
  onDiscoveriesChanged({
    ...discoveries,
    discoveredCharacterIconUrls:[...discoveries.discoveredCharacterIconUrls],
    discoveredItemIconUrls:[...discoveries.discoveredItemIconUrls]
  });
}
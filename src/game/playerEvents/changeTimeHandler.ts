/* This file handles player-requested timeline changes and their pause feedback.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import GameState from '../types/GameState';
import ChangeTimeEvent from './types/ChangeTimeEvent';
import { createPauseEffect } from '../effects/playPauseEffectUtil';

export function updateGameStateForChangeTime(gameState:GameState, event:ChangeTimeEvent, metaTime:number) {
  const wasPlaying = gameState.isPlaying;
  gameState.time = event.time;
  gameState.isPlaying = false;
  gameState.metaTimeToGameTimeOffset = 0;
  if (wasPlaying) gameState.metaTimeEffects.push(createPauseEffect(metaTime));
}
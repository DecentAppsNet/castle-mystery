/* This file handles player-requested playback changes and their feedback.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import GameState from '../types/GameState';
import PlayPauseEvent from './types/PlayPauseEvent';
import { createPauseEffect, createPlayEffect } from '../effects/playPauseEffectUtil';

export function updateGameStateForPlayPause(gameState:GameState, event:PlayPauseEvent, metaTime:number) {
  const wasPlaying = gameState.isPlaying;

  // Update playback state and its clock offset.
  gameState.isPlaying = event.isPlaying;
  if (event.isPlaying) {
    gameState.metaTimeToGameTimeOffset = gameState.time - metaTime;
  } else {
    gameState.metaTimeToGameTimeOffset = 0; // To find errors if code incorrectly assumes the value to be set.
  }

  // Emit feedback only for a real playback transition.
  if (wasPlaying !== event.isPlaying) {
    gameState.metaTimeEffects.push(event.isPlaying ? createPlayEffect(metaTime) : createPauseEffect(metaTime));
  }
}
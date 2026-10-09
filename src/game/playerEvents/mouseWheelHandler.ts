/* This file handles player-requested camera zoom changes.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from '@/common/numberUtil';
import GameState from '../types/GameState';
import MouseWheelEvent from './types/MouseWheelEvent';

const CAMERA_ZOOM_STEP = 0.1;

export function updateGameStateForMouseWheel(gameState:GameState, event:MouseWheelEvent) {
  if (event.deltaY === 0) return;
  const zoomDirection = -Math.sign(event.deltaY);
  if (zoomDirection === 0) return;
  gameState.camera.zoomAmount = clamp(gameState.camera.zoomAmount + zoomDirection * CAMERA_ZOOM_STEP, 0, 1);
}
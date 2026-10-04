/* This file prepares level-view frames and coordinates the initial closed-frame paint notification.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { prepareRoomShellCache } from '@/game/drawing/gameStateDrawUtil';
import type GameState from '@/game/types/GameState';
import { calculateCurtainFrame } from './curtains';
import type CurtainFrame from './curtains/types/CurtainFrame';
import type LevelViewFrameState from './types/LevelViewFrameState';
import type InitialClosedFrameHandoff from './types/InitialClosedFrameHandoff';

/** Prepares room-shell caches only when game-state identity or positive destination dimensions change. */
export function prepareLevelViewCache(state:LevelViewFrameState, gameState:GameState|null, width:number, height:number) {
  if (!gameState || width <= 0 || height <= 0) return;
  const prepared = state.preparedCache;
  if (prepared?.gameState === gameState && prepared.width === width && prepared.height === height) return;
  prepareRoomShellCache(gameState, width, height);
  state.preparedCache = { gameState, width, height };
}

/** Prepares current-size caches and advances opening when preparation and the closed hold are complete. */
export function prepareLevelViewFrame(state:LevelViewFrameState, gameState:GameState|null,
  width:number, height:number, hasLoadingFailed:boolean, now:number):CurtainFrame {
  // Establish startup closure and calculate the current presentation.
  state.transition ??= { phase:'closed', startedAt:now };
  let frame = calculateCurtainFrame(state.transition, now);
  prepareLevelViewCache(state, gameState, width, height);

  // Begin scene eligibility on the first opening frame, after cache and hold readiness.
  if (gameState && state.preparedCache?.gameState === gameState && width > 0 && height > 0
    && state.transition.phase === 'closed' && frame.isClosedHoldComplete && !hasLoadingFailed) {
    state.transition = { phase:'opening', startedAt:now };
    frame = calculateCurtainFrame(state.transition, now);
  }
  if (state.transition.phase === 'opening' && frame.isTransitionComplete) {
    state.transition = { phase:'open', startedAt:now };
  }
  return frame;
}

/** Clears the unloaded canvas and removes a stale interactive cursor before overlay painting. */
export function clearLevelView(context:CanvasRenderingContext2D) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.canvas.style.cursor = 'default';
}

/** Announces startup closure once, allowing a browser paint between drawing and heavy initialization. */
export function announceInitialClosedFrame(handoff:InitialClosedFrameHandoff, onInitialClosedFrame:() => void) {
  if (handoff.hasAnnounced || handoff.pendingFrame !== null) return;
  handoff.pendingFrame = requestAnimationFrame(() => {
    handoff.pendingFrame = requestAnimationFrame(() => {
      handoff.pendingFrame = null;
      handoff.hasAnnounced = true;
      onInitialClosedFrame();
    });
  });
}

/** Cancels any outstanding startup notification when LevelView's effect is cleaned up. */
export function cancelInitialClosedFrame(handoff:InitialClosedFrameHandoff) {
  if (handoff.pendingFrame !== null) cancelAnimationFrame(handoff.pendingFrame);
  handoff.pendingFrame = null;
}
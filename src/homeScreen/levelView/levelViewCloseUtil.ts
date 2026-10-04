/* This file advances curtain closing and paint handoffs through observations from Canvas's existing draw loop.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calculateCurtainFrame } from './curtains';
import type InitialClosedFrameHandoff from './types/InitialClosedFrameHandoff';
import type LevelViewFrameState from './types/LevelViewFrameState';

/** Returns true once on a later animation frame; null denotes a synchronous draw with no frame boundary. */
export function observeClosedCurtainFrame(handoff:InitialClosedFrameHandoff, timestamp:number|null):boolean {
  if (timestamp === null || handoff.hasAnnounced) return false;
  handoff.drawnAt ??= timestamp;
  if (timestamp <= handoff.drawnAt) return false;
  handoff.hasAnnounced = true;
  return true;
}

/** Starts curtain closing once; repeated requests reuse its promise until the closed-curtain notification. */
export function requestCurtainClose(state:LevelViewFrameState, now:number):Promise<boolean> {
  if (state.closeRequest) return state.closeRequest.promise;
  state.awaitingReplacement = true;
  state.transition = { phase:'closing', startedAt:now };
  let resolveClose!:(isClosed:boolean) => void;
  const promise = new Promise<boolean>(resolve => { resolveClose = resolve; });
  state.closeRequest = { promise, resolve:resolveClose, drawnAt:null, hasAnnounced:false };
  return promise;
}

/** Starts the closed hold at the settling deadline, rather than at a delayed hidden-tab resume. */
export function advanceCurtainClosing(state:LevelViewFrameState, now:number) {
  if (state.transition?.phase !== 'closing') return;
  const frame = calculateCurtainFrame(state.transition, now);
  if (frame.isTransitionComplete && frame.transitionEndsAt !== null) {
    state.transition = { phase:'closed', startedAt:frame.transitionEndsAt };
  }
}

/** Called after drawing the closed curtain; a later Canvas frame releases loading once, without scheduling callbacks. */
export function announceCurtainClosed(state:LevelViewFrameState, timestamp:number|null) {
  const request = state.closeRequest;
  if (!request || state.transition?.phase !== 'closed' || !observeClosedCurtainFrame(request, timestamp)) return;
  state.closeRequest = null;
  request.resolve(true);
}

/** Settles an unmounted view's pending wait without permitting its caller to start loading. */
export function cancelCurtainClose(state:LevelViewFrameState) {
  state.closeRequest?.resolve(false);
  state.closeRequest = null;
}
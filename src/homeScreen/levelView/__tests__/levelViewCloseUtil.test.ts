import { describe, expect, it } from 'vitest';

import { calculateCurtainFrame } from '../curtains';
import { advanceCurtainClosing, announceCurtainClosed, cancelCurtainClose,
  observeClosedCurtainFrame, requestCurtainClose } from '../levelViewCloseUtil';
import type InitialClosedFrameHandoff from '../types/InitialClosedFrameHandoff';
import type LevelViewFrameState from '../types/LevelViewFrameState';

describe('levelViewCloseUtil', () => {
  describe('observeClosedCurtainFrame()', () => {
    it('ignores synchronous draws before and after an animation-frame observation', () => {
      const handoff:InitialClosedFrameHandoff = { drawnAt:null, hasAnnounced:false };
      expect(observeClosedCurtainFrame(handoff, null)).toBe(false);
      expect(handoff.drawnAt).toBeNull();
      expect(observeClosedCurtainFrame(handoff, 100)).toBe(false);
      expect(observeClosedCurtainFrame(handoff, null)).toBe(false);
      expect(handoff.hasAnnounced).toBe(false);
    });

    it('announces once on a strictly later frame, not a repeated or older timestamp', () => {
      const handoff:InitialClosedFrameHandoff = { drawnAt:null, hasAnnounced:false };
      expect(observeClosedCurtainFrame(handoff, 100)).toBe(false);
      expect(observeClosedCurtainFrame(handoff, 100)).toBe(false);
      expect(observeClosedCurtainFrame(handoff, 99)).toBe(false);
      expect(observeClosedCurtainFrame(handoff, 116)).toBe(true);
      expect(observeClosedCurtainFrame(handoff, 132)).toBe(false);
    });
  });

  describe('requestCurtainClose()', () => {
    it('reuses the pending promise without restarting closure', async () => {
      const state:LevelViewFrameState = { transition:null, preparedCache:null, closeRequest:null, awaitingReplacement:false };
      const pending = requestCurtainClose(state, 100);
      expect(requestCurtainClose(state, 500)).toBe(pending);
      expect(state.transition).toEqual({ phase:'closing', startedAt:100 });
      expect(state.awaitingReplacement).toBe(true);
      cancelCurtainClose(state);
      await expect(pending).resolves.toBe(false);
    });
  });

  describe('advanceCurtainClosing()', () => {
    it('keeps the scene eligible through settling and starts the hold at its exact endpoint', () => {
      const state:LevelViewFrameState = { transition:null, preparedCache:null, closeRequest:null, awaitingReplacement:false };
      requestCurtainClose(state, 100);
      advanceCurtainClosing(state, 1259);
      expect(calculateCurtainFrame(state.transition!, 1259).canRenderScene).toBe(true);
      advanceCurtainClosing(state, 1260);
      const frame = calculateCurtainFrame(state.transition!, 1260);
      expect(state.transition).toEqual({ phase:'closed', startedAt:1260 });
      expect(frame.canRenderScene).toBe(false);
      expect(frame.settlingDisplacement).toBe(0);
      expect(frame.closedHoldEndsAt).toBe(2420);
      cancelCurtainClose(state);
    });

    it('catches up after a hidden interval without restarting the closed hold', () => {
      const state:LevelViewFrameState = { transition:null, preparedCache:null, closeRequest:null, awaitingReplacement:false };
      requestCurtainClose(state, 100);
      advanceCurtainClosing(state, 10000);
      expect(state.transition).toEqual({ phase:'closed', startedAt:1260 });
      expect(calculateCurtainFrame(state.transition!, 10000).isClosedHoldComplete).toBe(true);
      expect(state.awaitingReplacement).toBe(true);
      cancelCurtainClose(state);
    });
  });

  describe('announceCurtainClosed()', () => {
    it('releases its waiter only after closure is drawn in a later animation frame', async () => {
      const state:LevelViewFrameState = { transition:null, preparedCache:null, closeRequest:null, awaitingReplacement:false };
      let hasCompleted = false;
      const pending = requestCurtainClose(state, 0).then(result => { hasCompleted = result; });
      announceCurtainClosed(state, 1159);
      expect(state.closeRequest?.drawnAt).toBeNull();
      advanceCurtainClosing(state, 1160);
      announceCurtainClosed(state, null);
      announceCurtainClosed(state, 1160);
      announceCurtainClosed(state, 1160);
      announceCurtainClosed(state, null);
      await Promise.resolve();
      expect(hasCompleted).toBe(false);
      expect(state.closeRequest).not.toBeNull();
      announceCurtainClosed(state, 1176);
      await pending;
      expect(hasCompleted).toBe(true);
      expect(state.closeRequest).toBeNull();
      expect(state.awaitingReplacement).toBe(true);
      announceCurtainClosed(state, 1192);
      expect(state.closeRequest).toBeNull();
    });
  });

  describe('cancelCurtainClose()', () => {
    it('settles an unmounted view before any closed draw without permitting loading', async () => {
      const state:LevelViewFrameState = { transition:null, preparedCache:null, closeRequest:null, awaitingReplacement:false };
      const pending = requestCurtainClose(state, 0);
      cancelCurtainClose(state);
      await expect(pending).resolves.toBe(false);
      expect(state.closeRequest).toBeNull();
    });

    it('cancels between the first closed draw and its later-frame notification', async () => {
      const state:LevelViewFrameState = { transition:null, preparedCache:null, closeRequest:null, awaitingReplacement:false };
      const pending = requestCurtainClose(state, 0);
      advanceCurtainClosing(state, 1160);
      announceCurtainClosed(state, 1160);
      cancelCurtainClose(state);
      announceCurtainClosed(state, 1176);
      await expect(pending).resolves.toBe(false);
      expect(state.closeRequest).toBeNull();
    });
  });
});
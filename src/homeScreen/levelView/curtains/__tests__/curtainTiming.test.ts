import { describe, expect, it } from 'vitest';

import { MIN_CLOSED_MS, calculateCurtainFrame } from '../curtainTiming';
import type CurtainTransition from '../types/CurtainTransition';

describe('curtainTiming', () => {
  describe('calculateCurtainFrame()', () => {
    it('starts closed without settling or scene rendering', () => {
      const frame = calculateCurtainFrame({ phase:'closed', startedAt:100 }, 100);
      expect(frame).toEqual({
        curtainAmount:1,
        valanceAmount:1,
        settlingDisplacement:0,
        canRenderScene:false,
        isTransitionComplete:false,
        transitionEndsAt:null,
        closedHoldEndsAt:1260,
        isClosedHoldComplete:false
      });
      expect(MIN_CLOSED_MS).toBe(1160);
    });

    it('keeps the open endpoint completely hidden and scene eligible', () => {
      const frame = calculateCurtainFrame({ phase:'open', startedAt:100 }, 5000);
      expect(frame.curtainAmount).toBe(0);
      expect(frame.valanceAmount).toBe(0);
      expect(frame.settlingDisplacement).toBe(0);
      expect(frame.canRenderScene).toBe(true);
      expect(frame.transitionEndsAt).toBeNull();
      expect(frame.closedHoldEndsAt).toBeNull();
      expect(frame.isClosedHoldComplete).toBe(false);
    });

    it('lowers the valance with cubic ease-out before moving the halves', () => {
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 170);
      expect(frame.valanceAmount).toBe(0.875);
      expect(frame.curtainAmount).toBe(0);
      expect(frame.canRenderScene).toBe(true);
    });

    it('starts closing the halves only after the valance is fully lowered', () => {
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 240);
      expect(frame.valanceAmount).toBe(1);
      expect(frame.curtainAmount).toBe(0);
      expect(frame.settlingDisplacement).toBe(0);
    });

    it('closes the halves with smoothstep', () => {
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 345);
      expect(frame.curtainAmount).toBe(0.15625);
      expect(frame.valanceAmount).toBe(1);
    });

    it('does not complete closing when the halves first meet', () => {
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 660);
      expect(frame.curtainAmount).toBe(1);
      expect(frame.valanceAmount).toBe(1);
      expect(frame.settlingDisplacement).toBe(0);
      expect(frame.isTransitionComplete).toBe(false);
      expect(frame.canRenderScene).toBe(true);
      expect(frame.transitionEndsAt).toBe(1260);
      expect(frame.closedHoldEndsAt).toBe(2420);
    });

    it('uses damped settling motion while keeping the scene eligible', () => {
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 760);
      expect(frame.settlingDisplacement).toBeCloseTo(16 * Math.exp(-0.8) * Math.sin(1.8));
      expect(frame.canRenderScene).toBe(true);
      expect(frame.isTransitionComplete).toBe(false);
    });

    it('retains rendering eligibility through the final settling interval', () => {
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 1259);
      expect(frame.settlingDisplacement).not.toBe(0);
      expect(frame.canRenderScene).toBe(true);
      expect(frame.isTransitionComplete).toBe(false);
    });

    it('finishes at exactly zero displacement and excludes the scene at full close', () => {
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 1260);
      expect(frame.settlingDisplacement).toBe(0);
      expect(frame.curtainAmount).toBe(1);
      expect(frame.valanceAmount).toBe(1);
      expect(frame.isTransitionComplete).toBe(true);
      expect(frame.canRenderScene).toBe(false);
      expect(frame.isClosedHoldComplete).toBe(false);
    });

    it('requires the additional closed hold after settling', () => {
      const transition:CurtainTransition = { phase:'closing', startedAt:100 };
      expect(calculateCurtainFrame(transition, 2419).isClosedHoldComplete).toBe(false);
      expect(calculateCurtainFrame(transition, 2420).isClosedHoldComplete).toBe(true);
    });

    it('measures the startup closed hold from initial closed establishment', () => {
      const transition:CurtainTransition = { phase:'closed', startedAt:100 };
      expect(calculateCurtainFrame(transition, 1259).isClosedHoldComplete).toBe(false);
      expect(calculateCurtainFrame(transition, 1260).isClosedHoldComplete).toBe(true);
      expect(calculateCurtainFrame(transition, 5000).isClosedHoldComplete).toBe(true);
    });

    it('allows scene rendering from the first opening frame', () => {
      const frame = calculateCurtainFrame({ phase:'opening', startedAt:100 }, 100);
      expect(frame.canRenderScene).toBe(true);
      expect(frame.curtainAmount).toBe(1);
      expect(frame.valanceAmount).toBe(1);
      expect(frame.closedHoldEndsAt).toBeNull();
    });

    it('opens the halves with cubic ease-out while the valance stays lowered', () => {
      const frame = calculateCurtainFrame({ phase:'opening', startedAt:100 }, 410);
      expect(frame.curtainAmount).toBe(0.125);
      expect(frame.valanceAmount).toBe(1);
      expect(frame.isTransitionComplete).toBe(false);
    });

    it('keeps the valance lowered until the halves are fully open', () => {
      const frame = calculateCurtainFrame({ phase:'opening', startedAt:100 }, 720);
      expect(frame.curtainAmount).toBe(0);
      expect(frame.valanceAmount).toBe(1);
      expect(frame.transitionEndsAt).toBe(900);
      expect(frame.isTransitionComplete).toBe(false);
    });

    it('raises the valance with smoothstep after opening the halves', () => {
      const frame = calculateCurtainFrame({ phase:'opening', startedAt:100 }, 765);
      expect(frame.curtainAmount).toBe(0);
      expect(frame.valanceAmount).toBe(0.84375);
      expect(frame.isTransitionComplete).toBe(false);
    });

    it('hides the complete overlay at the exact opening endpoint', () => {
      const transition:CurtainTransition = { phase:'opening', startedAt:100 };
      expect(calculateCurtainFrame(transition, 899).isTransitionComplete).toBe(false);
      const frame = calculateCurtainFrame(transition, 900);
      expect(frame.curtainAmount).toBe(0);
      expect(frame.valanceAmount).toBe(0);
      expect(frame.settlingDisplacement).toBe(0);
      expect(frame.isTransitionComplete).toBe(true);
      expect(frame.canRenderScene).toBe(true);
    });

    it('bounds calculations earlier than the transition start', () => {
      const closing = calculateCurtainFrame({ phase:'closing', startedAt:100 }, 0);
      expect(closing.curtainAmount).toBe(0);
      expect(closing.valanceAmount).toBe(0);
      const opening = calculateCurtainFrame({ phase:'opening', startedAt:100 }, 0);
      expect(opening.curtainAmount).toBe(1);
      expect(opening.valanceAmount).toBe(1);
    });

    it('catches up from explicit timestamps without game time or previous calculations', () => {
      const transition:CurtainTransition = Object.freeze({ phase:'closing', startedAt:100 });
      const lateFrame = calculateCurtainFrame(transition, 10000);
      expect(lateFrame.curtainAmount).toBe(1);
      expect(lateFrame.valanceAmount).toBe(1);
      expect(lateFrame.settlingDisplacement).toBe(0);
      expect(lateFrame.isTransitionComplete).toBe(true);
      expect(lateFrame.isClosedHoldComplete).toBe(true);
      expect(lateFrame.canRenderScene).toBe(false);
      expect(calculateCurtainFrame(transition, 760).isTransitionComplete).toBe(false);
      expect(calculateCurtainFrame(transition, 10000)).toEqual(lateFrame);
      expect(transition).toEqual({ phase:'closing', startedAt:100 });
    });
  });
});
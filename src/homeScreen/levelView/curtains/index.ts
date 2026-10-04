/* This file exposes curtain frame calculation and overlay painting to the level view.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export { calculateCurtainFrame, isCurtainVisible } from './curtainTiming';
export { drawCurtainOverlay } from './curtainDrawUtil';
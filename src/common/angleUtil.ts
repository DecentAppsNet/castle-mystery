/* This file groups common angle math helpers for normalization, comparison, and interpolation.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

/** Normalizes a finite angle in radians to the interval (-PI, PI]. */
export function normalizeAngle(angle:number):number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

/** Returns the direction in radians from the first point to the second. */
export function calcAngleBetweenPoints(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.atan2(toY - fromY, toX - fromX);
}

/** Returns the shortest signed angular change in radians, choosing +PI for a half-turn. */
export function calcShortestAngleDelta(fromAngle:number, toAngle:number):number {
  return normalizeAngle(toAngle - fromAngle);
}

/** Interpolates along the shortest turn; amounts outside [0, 1] extrapolate. */
export function interpolateAngle(fromAngle:number, toAngle:number, interpolateAmount:number):number {
  return normalizeAngle(fromAngle + calcShortestAngleDelta(fromAngle, toAngle) * interpolateAmount);
}
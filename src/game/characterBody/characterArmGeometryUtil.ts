/* This file defines shared local geometry measurements for placeholder character arms.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

/** Returns upper-arm thickness in local game units from the part's drawing bounds. */
export function getArmThickness(width:number, height:number):number {
  return Math.min(width / 2, height / 4);
}
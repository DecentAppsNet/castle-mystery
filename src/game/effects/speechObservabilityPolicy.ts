/* This file defines nonvisual policy for whether active speech effects are observable.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

/** Returns whether a presented character's thought is observable to the current observer. */
export function isThoughtObservable(isActiveCharacter:boolean, isLevelComplete:boolean):boolean {
  return isActiveCharacter || isLevelComplete;
}
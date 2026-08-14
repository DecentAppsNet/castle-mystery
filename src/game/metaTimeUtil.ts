/* This module groups helpers related to meta-time, which is s time value used during game updata and draw for handling animations
   and timing events that are independent from the current timeline position in game state. 
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

// Even though the meta-time value could easily be retrieved directly from performance.now(), this function is intended to centralize
// the retrieval of the time value for consistency. And it may later support pausing and other control. Callers should avoid calling this
// function more than once during one animation frame request. Instead, store and reuse the retrieved value for the duration of one animation
// frame request.
export function findMetaTimeNow():number {
  return performance.now();
}
/* This module groups the stair-flight model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Position, { duplicatePosition } from "./Position";

type StairFlight = {
  startPosition:Position,
  endPosition:Position
};

export function duplicateStairFlight(from:StairFlight):StairFlight {
  return {
    startPosition:duplicatePosition(from.startPosition),
    endPosition:duplicatePosition(from.endPosition)
  };
}

export default StairFlight;
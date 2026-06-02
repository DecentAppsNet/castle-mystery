/* This module groups shared stair geometry constants and low-level helpers for stair navigation and rendering.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Position from "./types/Position";
import StairFlight from "./types/StairFlight";

export const STAIR_POSITION_TOLERANCE = 0.000001;

type StairFlightIntersection = {
  flight:StairFlight,
  x:number
};

function _positionsMatch(position1:Position, position2:Position):boolean {
  return Math.abs(position1.x - position2.x) <= STAIR_POSITION_TOLERANCE
    && Math.abs(position1.y - position2.y) <= STAIR_POSITION_TOLERANCE;
}

export function doesStairFlightEndAtPosition(flights:ReadonlyArray<StairFlight>, position:Position):boolean {
  return flights.some(flight => _positionsMatch(flight.endPosition, position));
}

export function findStairFlightIntersectionAtY(flights:ReadonlyArray<StairFlight>, targetY:number):StairFlightIntersection|null {
  for (const flight of flights) {
    const minY = Math.min(flight.startPosition.y, flight.endPosition.y);
    const maxY = Math.max(flight.startPosition.y, flight.endPosition.y);
    if (targetY < minY - STAIR_POSITION_TOLERANCE || targetY > maxY + STAIR_POSITION_TOLERANCE) continue;

    const totalRise = flight.endPosition.y - flight.startPosition.y;
    const totalRun = flight.endPosition.x - flight.startPosition.x;
    if (Math.abs(totalRise) <= STAIR_POSITION_TOLERANCE) continue;
    const yRatio = (targetY - flight.startPosition.y) / totalRise;
    return {
      flight,
      x:flight.startPosition.x + totalRun * yRatio
    };
  }
  return null;
}
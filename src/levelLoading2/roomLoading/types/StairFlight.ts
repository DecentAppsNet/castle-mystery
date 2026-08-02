import Position, { duplicatePosition } from "@/game/types/Position";

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
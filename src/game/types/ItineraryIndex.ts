import Position, { duplicatePosition } from "./Position";

type ItineraryIndex = {
  eventStartTimes:ReadonlyArray<number>,
  eventStartPositions:ReadonlyArray<Position>
}

export function duplicateItineraryIndex(from:ItineraryIndex):ItineraryIndex {
  return {
    eventStartTimes:[...from.eventStartTimes],
    eventStartPositions:from.eventStartPositions.map(duplicatePosition)
  };
}

export default ItineraryIndex;
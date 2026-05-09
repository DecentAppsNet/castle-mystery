import Position, { duplicatePosition } from "./Position";

type ItineraryIndex = Readonly<{
  eventStartTimes:ReadonlyArray<number>,
  eventStartPositions:ReadonlyArray<Position>,
  roomEntryStartTimes:ReadonlyArray<number>
}>

export function duplicateItineraryIndex(from:ItineraryIndex):ItineraryIndex {
  return {
    eventStartTimes:[...from.eventStartTimes],
    eventStartPositions:from.eventStartPositions.map(duplicatePosition),
    roomEntryStartTimes:[...from.roomEntryStartTimes]
  };
}

export default ItineraryIndex;
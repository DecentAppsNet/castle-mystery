import Position from "./Position";

type ItineraryIndex = Readonly<{
  eventStartTimes:ReadonlyArray<number>,
  eventStartPositions:ReadonlyArray<Position>,
  roomEntryStartTimes:ReadonlyArray<number>
}>

export default ItineraryIndex;
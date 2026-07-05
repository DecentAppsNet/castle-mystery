import Position from "./Position";

type ItineraryIndex = Readonly<{
  eventStartTimes:ReadonlyArray<number>,
  eventStartPositions:ReadonlyArray<Position>,
  roomEntryStartTimes:ReadonlyArray<number>
}>

export function createDefaultItineraryIndex() {
  return { eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
}

export default ItineraryIndex;
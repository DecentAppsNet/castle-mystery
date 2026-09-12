import TimeRange from "./TimeRange"

type ItineraryMarkerModel = {
  roomEntryTimes:number[],
  speechRanges:TimeRange[],
  encounterTimes:number[],
  obscuredRanges:TimeRange[]
}

export default ItineraryMarkerModel;
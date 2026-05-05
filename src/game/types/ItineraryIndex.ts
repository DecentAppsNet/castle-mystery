type ItineraryIndex = {
  eventStartTimes:ReadonlyArray<number>
}

export function duplicateItineraryIndex(from:ItineraryIndex):ItineraryIndex {
  return {
    eventStartTimes:[...from.eventStartTimes]
  };
}

export default ItineraryIndex;
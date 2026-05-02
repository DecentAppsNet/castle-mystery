import ItineraryEventType from "./ItineraryEventType";

type ItineraryEventBase = {
  type: ItineraryEventType,
  startTime: number
}

export default ItineraryEventBase;

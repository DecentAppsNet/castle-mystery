import ItineraryEventType from "./ItineraryEventType";

type ItineraryEventBase = {
  type: ItineraryEventType,
  startTime: number,
  duration:number
}

export default ItineraryEventBase;

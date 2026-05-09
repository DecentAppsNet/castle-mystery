import ItineraryEventType from "./ItineraryEventType";

type ItineraryEventBase = Readonly<{
  type: ItineraryEventType,
  startTime: number,
  duration:number
}>

export default ItineraryEventBase;

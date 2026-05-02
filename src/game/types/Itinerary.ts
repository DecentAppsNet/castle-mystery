
import ItineraryEvent, { duplicateItineraryEvent } from "./itineraryEvents/ItineraryEvent";

type Itinerary = ItineraryEvent[];

export function duplicateItinerary(from:Itinerary):Itinerary {
  return from.map(duplicateItineraryEvent);
}

export default Itinerary;
import Itinerary, { duplicateItinerary } from "./Itinerary";
import ItineraryIndex, { duplicateItineraryIndex } from "./ItineraryIndex";

type Character = {
  id:string,
  x:number,
  y:number,
  itinerary:Itinerary,
  itineraryIndex:ItineraryIndex
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id, x:from.x, y:from.y, 
    itinerary:duplicateItinerary(from.itinerary),
    itineraryIndex:duplicateItineraryIndex(from.itineraryIndex)
  };
}

export default Character;
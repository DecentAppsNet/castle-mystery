import Itinerary, { duplicateItinerary } from "./Itinerary";
import ItineraryIndex, { duplicateItineraryIndex } from "./ItineraryIndex";

type Character = {
  id:string,
  x:number,
  y:number,
  facingAngle:number,
  itinerary:Itinerary,
  itineraryIndex:ItineraryIndex
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id, x:from.x, y:from.y, facingAngle:from.facingAngle,
    itinerary:duplicateItinerary(from.itinerary),
    itineraryIndex:duplicateItineraryIndex(from.itineraryIndex)
  };
}

export default Character;
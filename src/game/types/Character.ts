import Itinerary, { duplicateItinerary } from "./Itinerary";
import ItineraryIndex, { duplicateItineraryIndex } from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";

type Character = {
  id:string,
  description:string,
  items:Item[],
  x:number,
  y:number,
  facingAngle:number,
  itinerary:Itinerary,
  itineraryIndex:ItineraryIndex
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id,
    description:from.description,
    items:from.items.map(duplicateItem),
    x:from.x,
    y:from.y,
    facingAngle:from.facingAngle,
    itinerary:duplicateItinerary(from.itinerary),
    itineraryIndex:duplicateItineraryIndex(from.itineraryIndex)
  };
}

export default Character;
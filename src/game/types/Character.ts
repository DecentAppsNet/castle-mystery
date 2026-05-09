import Itinerary from "./Itinerary";
import ItineraryIndex from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";

type Character = {
  readonly id:string,
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
    itinerary:from.itinerary,
    itineraryIndex:from.itineraryIndex
  };
}

export default Character;
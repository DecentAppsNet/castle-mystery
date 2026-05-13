import Itinerary from "./Itinerary";
import ItineraryIndex from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";
import Waypoint from "./Waypoint";

type Character = {
  readonly id:string,
  readonly faceImageUrl:string|null,
  description:string,
  items:Item[],
  x:number,
  y:number,
  waypoint:Waypoint,
  facingAngle:number,
  itinerary:Itinerary,
  itineraryIndex:ItineraryIndex
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id,
    faceImageUrl:from.faceImageUrl,
    description:from.description,
    items:from.items.map(duplicateItem),
    x:from.x,
    y:from.y,
    waypoint:from.waypoint,
    facingAngle:from.facingAngle,
    itinerary:from.itinerary,
    itineraryIndex:from.itineraryIndex
  };
}

export default Character;
import Itinerary from "./Itinerary";
import ItineraryIndex from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";
import Waypoint from "./Waypoint";

type Character = {
  readonly id:string,
  readonly title:string,
  readonly faceImageUrl:string|null,
  isTitleKnown:boolean,
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
    title:from.title,
    faceImageUrl:from.faceImageUrl,
    isTitleKnown:from.isTitleKnown,
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
import Itinerary from "./Itinerary";
import ItineraryIndex from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";
import Waypoint from "./Waypoint";

type Character = {
  readonly id:string,
  readonly title:string,
  readonly faceImageUrl:string|null,
  readonly randomSalt:number,
  isTitleKnown:boolean,
  description:string,
  items:Item[],
  x:number,
  y:number,
  waypoint:Waypoint,
  discoveredRoomIds:string[],
  itinerary:Itinerary,
  itineraryIndex:ItineraryIndex
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id,
    title:from.title,
    faceImageUrl:from.faceImageUrl,
    randomSalt:from.randomSalt,
    isTitleKnown:from.isTitleKnown,
    description:from.description,
    items:from.items.map(duplicateItem),
    x:from.x,
    y:from.y,
    waypoint:from.waypoint,
    discoveredRoomIds:[...from.discoveredRoomIds],
    itinerary:from.itinerary,
    itineraryIndex:from.itineraryIndex
  };
}

export default Character;
import Coord, { duplicateCoord } from "./Coord";
import Itinerary, { duplicateItinerary } from "./Itinerary";

type Character = {
  id:string,
  x:number,
  y:number,
  itinerary:Itinerary,
  scrubCoords:Coord[]
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id, x:from.x, y:from.y, 
    itinerary:duplicateItinerary(from.itinerary),
    scrubCoords:from.scrubCoords.map(duplicateCoord)
  };
}

export default Character;
import Position, { duplicatePosition } from "./Position";
import Itinerary, { duplicateItinerary } from "./Itinerary";

type Character = {
  id:string,
  x:number,
  y:number,
  itinerary:Itinerary,
  scrubPositions:Position[]
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id, x:from.x, y:from.y, 
    itinerary:duplicateItinerary(from.itinerary),
    scrubPositions:from.scrubPositions.map(duplicatePosition)
  };
}

export default Character;
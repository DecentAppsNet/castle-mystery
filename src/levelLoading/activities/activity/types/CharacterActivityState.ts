import Item from "@/game/types/Item";
import Position from "@/game/types/Position";
import Waypoint from "@/game/types/Waypoint";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import type { BodyOrientation, FacingDirection } from "@/game/types/Character";

type CharacterActivityState = {
  events:ItineraryEvent[],
  time:number,
  isVisible:boolean,
  position:Position,
  waypoint:Waypoint,
  items:Item[],
  leftHandItem:Item|null,
  rightHandItem:Item|null,
  isAlive:boolean,
  facingDirection:FacingDirection,
  bodyOrientation:BodyOrientation,
  speech:string|null,
  thought:string|null
};

export default CharacterActivityState;
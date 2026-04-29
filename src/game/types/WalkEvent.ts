import ItineraryEventBase from "./ItineraryEventBase";
import Coord from "./Coord";

type WalkEvent = {
  composes: ItineraryEventBase,
  fromPosition: Coord,
  toPosition: Coord,
  duration: number
}

export default WalkEvent;

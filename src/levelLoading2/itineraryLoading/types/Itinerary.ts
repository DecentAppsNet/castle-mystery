import ItineraryKeyframe from "./ItineraryKeyframe";

type Itinerary = Readonly<{
  roomIdToI:{[roomId:string]:number};
  characterIdToI:{[characterId:string]:number};
  keyframes: ItineraryKeyframe[];
}>;

export default Itinerary;
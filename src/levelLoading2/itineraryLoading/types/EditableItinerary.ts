import EditableItineraryKeyframe from "./EditableItineraryKeyframe";
import ItineraryKeyframe from "./ItineraryKeyframe";

type EditableItinerary = {
  editableKeyframes: EditableItineraryKeyframe[];
  keyframes: ItineraryKeyframe[];
  roomIdToI:{[roomId:string]:number};
  characterIdToI:{[characterId:string]:number};
}

export function createDefaultEditableItinerary():EditableItinerary {
  return { 
    keyframes:[],
    editableKeyframes:[],
    roomIdToI:{},
    characterIdToI:{}
  }
}

export default EditableItinerary;
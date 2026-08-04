import EditableTimelineKeyframe from "./EditableTimelineKeyframe";
import TimelineKeyframe from "./TimelineKeyframe";

type EditableTimeline = {
  editableKeyframes: EditableTimelineKeyframe[];
  keyframes: TimelineKeyframe[];
  roomIdToI:{[roomId:string]:number};
  characterIdToI:{[characterId:string]:number};
}

export function createDefaultEditableTimeline():EditableTimeline {
  return { 
    keyframes:[],
    editableKeyframes:[],
    roomIdToI:{},
    characterIdToI:{}
  }
}

export default EditableTimeline;
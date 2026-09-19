import EditableTimelineKeyframe from "./EditableTimelineKeyframe";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";

/** Holds sparse editable keyframes, resolved keyframes, and entity index maps. */
type EditableTimeline = {
  editableKeyframes: EditableTimelineKeyframe[];
  keyframes: TimelineKeyframe[];
  roomIdToI:{[roomId:string]:number};
  characterIds:string[],
  characterIdToI:{[characterId:string]:number};
}

/** Creates an empty editable timeline. */
export function createDefaultEditableTimeline():EditableTimeline {
  return { 
    keyframes:[],
    editableKeyframes:[],
    roomIdToI:{},
    characterIds:[],
    characterIdToI:{}
  }
}

export default EditableTimeline;
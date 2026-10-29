import EditableTimelineKeyframe from "./EditableTimelineKeyframe";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import WalkingInterval from "./WalkingInterval";

/** Holds editable and resolved keyframes, pending walking intervals, and entity index maps. */
type EditableTimeline = {
  editableKeyframes: EditableTimelineKeyframe[];
  keyframes: TimelineKeyframe[];
  pendingWalkingIntervals:WalkingInterval[];
  roomIdToI:{[roomId:string]:number};
  characterIds:string[],
  characterIdToI:{[characterId:string]:number};
}

/** Creates an empty editable timeline. */
export function createDefaultEditableTimeline():EditableTimeline {
  return { 
    keyframes:[],
    editableKeyframes:[],
    pendingWalkingIntervals:[],
    roomIdToI:{},
    characterIds:[],
    characterIdToI:{}
  }
}

export default EditableTimeline;
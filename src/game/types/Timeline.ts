import TimelineKeyframe from "@/game/types/TimelineKeyframe";

type Timeline = Readonly<{
  roomIdToI:{[roomId:string]:number};
  characterIds:string[];
  characterIdToI:{[characterId:string]:number};
  keyframes: TimelineKeyframe[];
}>;

export function createDefaultTimeline():Timeline {
  return {
    roomIdToI:{},
    characterIds:[],
    characterIdToI:{},
    keyframes:[]
  };
}

export default Timeline;
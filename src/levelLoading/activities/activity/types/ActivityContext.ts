import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import Level from "@/game/types/Level";
import Position from "@/game/types/Position";

import ActivityTimestampType from "./ActivityTimestampType";
import CharacterActivityState from "./CharacterActivityState";

type ActivityContext = {
  level:Level,
  character:Character,
  activitySourceIndex:number,
  state:CharacterActivityState,
  roomItemsByRoomId:Map<string, Item[]>,
  charactersById:Map<string, Character>,
  characterStatesById:Map<string, CharacterActivityState>,
  poseOverridesByCharacterId:Map<string, Position>,
  timestamp:number,
  timestampType:ActivityTimestampType
};

export default ActivityContext;
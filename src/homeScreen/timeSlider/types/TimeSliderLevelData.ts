import type Character from "@/game/types/Character";
import type DiscoveryState from "@/game/types/DiscoveryState";
import type Room from "@/game/types/Room";
import type TimeLabel from "@/game/types/TimeLabel";
import type Timeline from "@/game/types/Timeline";

/** Level data used by the time panel, retaining references to current gameplay values. */
type TimeSliderLevelData = {
  readonly timeline:Timeline|null;
  readonly baseCharacters:Character[];
  readonly baseRooms:Room[];
  readonly activeCharacterId:string;
  readonly activeSkinIdAtSelection:string;
  readonly discoveryState:DiscoveryState;
  readonly labels:TimeLabel[];
};

export default TimeSliderLevelData;
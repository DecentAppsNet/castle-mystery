import Character from "@/game/types/Character";

import ResolvedItineraryTimeline from "./ResolvedItineraryTimeline";

type LoadItinerariesResult = {
  characters:Character[],
  allCharactersById:Map<string, Character>,
  duration:number,
  resolvedTimeline:ResolvedItineraryTimeline
};

export default LoadItinerariesResult;
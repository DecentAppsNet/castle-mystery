
// Keeps values that will later be assigned to level or inform level loading. Values generally left unassigned to the
// level object unless they can be fully validated, which sometimes means waiting until a needed dependency is available. If a value 

import ActivityParsingRules from "../activityLoading/types/ActivityParsingRules";

// can be assigned to level immediately, with no later validation needed, it shouldn't be in this type.
type LevelLoadingContext = {
  activeCharacterId:string, // Needs character ID allowed values and parsed itinerary for validation.
  startTime:number|null, // Needs parsed itinerary for validation.
  initialTime:number|null, // Needs parsed itinerary for validation.
  endTime:number|null, // Needs parsed itinerary for validation.
  discoverableCharacterCount:number|null, // Needs parsed itinerary for validation.
  discoverableItemCount:number|null, // Needs parsed itinerary for validation.
  discoverableRoomCount:number|null, // Needs parsed itinerary for validation.
  isCrossMidnight:boolean, // Used later.
  groundFloorRoomRef:string|null, // Needs room ID allowed values.
  activityParsingRules:ActivityParsingRules|null // Used later.
}

export default LevelLoadingContext;
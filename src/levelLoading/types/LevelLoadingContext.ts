import ActivityParsingRules from "../activityLoading/types/ActivityParsingRules";

/** Holds deferred values that require dependencies or later validation during level loading. */
type LevelLoadingContext = {
  activeCharacterId:string, // Needs character ID allowed values and parsed itinerary for validation.
  initialTime:number|null, // Needs parsed itinerary for validation.
  discoverableCharacterCount:number|null, // Needs parsed itinerary for validation.
  discoverableItemCount:number|null, // Needs parsed itinerary for validation.
  discoverableRoomCount:number|null, // Needs parsed itinerary for validation.
  groundFloorRoomRef:string|null, // Needs room ID allowed values.
  activityParsingRules:ActivityParsingRules // Used later.
}

export default LevelLoadingContext;
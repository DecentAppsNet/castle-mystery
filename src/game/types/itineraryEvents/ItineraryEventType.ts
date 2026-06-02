/* This module groups itinerary-event type values shared across authored timelines and runtime processing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

const ItineraryEventType = {
  WALK:"Walk",
  FACE:"Face",
  ROOM_ENTRY:"RoomEntry",
  SPEECH:"Speech",
  THOUGHT:"Thought",
  CHARACTER_ENCOUNTER:"CharacterEncounter",
  TAKE_ITEM:"TakeItem",
  DROP_ITEM:"DropItem",
  GIVE_ITEM:"GiveItem",
  LOCK:"Lock",
  UNLOCK:"Unlock"
} as const;

type ItineraryEventType = typeof ItineraryEventType[keyof typeof ItineraryEventType];

export default ItineraryEventType;

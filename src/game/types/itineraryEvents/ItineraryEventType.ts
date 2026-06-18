const ItineraryEventType = {
  WALK:"Walk",
  DIE:"Die",
  FACE:"Face",
  BODY_ORIENTATION:"BodyOrientation",
  ROOM_ENTRY:"RoomEntry",
  SPEECH:"Speech",
  EMIT:"Emit",
  THOUGHT:"Thought",
  CHARACTER_ENCOUNTER:"CharacterEncounter",
  TAKE_ITEM:"TakeItem",
  DROP_ITEM:"DropItem",
  GIVE_ITEM:"GiveItem",
  SHOW:"Show",
  HIDE:"Hide",
  LOCK:"Lock",
  UNLOCK:"Unlock"
} as const;

type ItineraryEventType = typeof ItineraryEventType[keyof typeof ItineraryEventType];

export default ItineraryEventType;

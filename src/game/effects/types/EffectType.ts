const EffectType = {
  PLAY:"Play",
  PAUSE:"Pause",
  CHARACTER_SELECT:"CharacterSelect",
  TALKING:"Talking",
  SPEECH_BUBBLE:"SpeechBubble",
  THOUGHT_BUBBLE:"ThoughtBubble",
  TAKE_ITEM:"TakeItem",
  DROP_ITEM:"DropItem",
  GIVE_ITEM:"GiveItem",
  LOCK:"Lock",
  UNLOCK:"Unlock"
} as const;

type EffectType = typeof EffectType[keyof typeof EffectType];

export default EffectType;

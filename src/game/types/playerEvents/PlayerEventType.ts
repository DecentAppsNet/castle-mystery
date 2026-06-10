const PlayerEventType = {
  CHANGE_TIME:"ChangeTime",
  CHANGE_CONCLUSIONS:"ChangeConclusions",
  NEXT_CHARACTER:"NextCharacter",
  PLAY_PAUSE:"PlayPause",
  MOUSEDOWN:"MouseDown",
  MOUSEMOVE:"MouseMove",
  MOUSEWHEEL:"MouseWheel"
} as const;

type PlayerEventType = typeof PlayerEventType[keyof typeof PlayerEventType];

export default PlayerEventType;

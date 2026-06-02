/* This module groups player-event type values used by queued UI input events.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

const PlayerEventType = {
  CHANGE_TIME:"ChangeTime",
  CHANGE_SOLUTIONS:"ChangeSolutions",
  NEXT_CHARACTER:"NextCharacter",
  PLAY_PAUSE:"PlayPause",
  MOUSEDOWN:"MouseDown",
  MOUSEMOVE:"MouseMove",
  MOUSEWHEEL:"MouseWheel"
} as const;

type PlayerEventType = typeof PlayerEventType[keyof typeof PlayerEventType];

export default PlayerEventType;

import PlayerEventBase from "./PlayerEventBase";

type PlayPauseEvent = PlayerEventBase & {
  isPlaying: boolean
}

export default PlayPauseEvent;
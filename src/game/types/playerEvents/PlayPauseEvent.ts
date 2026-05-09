import PlayerEventBase from "./PlayerEventBase";

type PlayPauseEvent = Readonly<PlayerEventBase & {
  isPlaying: boolean
}>

export default PlayPauseEvent;
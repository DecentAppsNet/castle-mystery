import PlayerEventType from "./PlayerEventType";

type PlayerEventBase = Readonly<{
  type: PlayerEventType
}>

export default PlayerEventBase;

import PlayerEventBase from "./PlayerEventBase";

type ChangeTimeEvent = Readonly<PlayerEventBase & {
  time: number
}>

export default ChangeTimeEvent;
import PlayerEventBase from "./PlayerEventBase";

type ChangeTimeEvent = PlayerEventBase & {
  time: number
}

export default ChangeTimeEvent;
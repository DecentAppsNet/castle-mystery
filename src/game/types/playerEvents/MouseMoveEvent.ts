import PlayerEventBase from "./PlayerEventBase";

type MouseMoveEvent = PlayerEventBase & {
  x:number,
  y:number
}

export default MouseMoveEvent;
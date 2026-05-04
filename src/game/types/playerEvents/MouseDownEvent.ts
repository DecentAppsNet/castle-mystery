import PlayerEventBase from "./PlayerEventBase";

type MouseDownEvent = PlayerEventBase & {
  x:number,
  y:number
}

export default MouseDownEvent;
import PlayerEventBase from "./PlayerEventBase";

type MouseMoveEvent = Readonly<PlayerEventBase & {
  x:number,
  y:number
}>

export default MouseMoveEvent;
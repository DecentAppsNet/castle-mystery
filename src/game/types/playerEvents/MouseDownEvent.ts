import PlayerEventBase from "./PlayerEventBase";

type MouseDownEvent = Readonly<PlayerEventBase & {
  x:number,
  y:number
}>

export default MouseDownEvent;
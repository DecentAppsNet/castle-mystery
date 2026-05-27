import PlayerEventType from "./PlayerEventType";

type MouseWheelEvent = {
  type:PlayerEventType.MOUSEWHEEL,
  deltaY:number
}

export default MouseWheelEvent;
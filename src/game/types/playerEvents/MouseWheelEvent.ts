import PlayerEventType from "./PlayerEventType";

type MouseWheelEvent = {
  type:typeof PlayerEventType.MOUSEWHEEL,
  deltaY:number
}

export default MouseWheelEvent;
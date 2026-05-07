import ChangeTimeEvent from "./ChangeTimeEvent";
import MouseDownEvent from "./MouseDownEvent";
import MouseMoveEvent from "./MouseMoveEvent";
import PlayPauseEvent from "./PlayPauseEvent";

type PlayerEvent = ChangeTimeEvent | PlayPauseEvent | MouseDownEvent | MouseMoveEvent;

export default PlayerEvent;
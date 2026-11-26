import ChangeTimeEvent from "./ChangeTimeEvent";
import MouseDownEvent from "./MouseDownEvent";
import MouseMoveEvent from "./MouseMoveEvent";
import MouseWheelEvent from "./MouseWheelEvent";
import NextCharacterEvent from "./NextCharacterEvent";
import PlayPauseEvent from "./PlayPauseEvent";

type PlayerEvent = ChangeTimeEvent | NextCharacterEvent | PlayPauseEvent | MouseDownEvent | MouseMoveEvent | MouseWheelEvent;

export default PlayerEvent;
import ChangeTimeEvent from "./ChangeTimeEvent";
import MouseDownEvent from "./MouseDownEvent";
import PlayPauseEvent from "./PlayPauseEvent";

type PlayerEvent = ChangeTimeEvent | PlayPauseEvent | MouseDownEvent;

export default PlayerEvent;
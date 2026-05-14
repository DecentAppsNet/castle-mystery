import ChangeTimeEvent from "./ChangeTimeEvent";
import ChangeSolutionsEvent from "./ChangeSolutionsEvent";
import MouseDownEvent from "./MouseDownEvent";
import MouseMoveEvent from "./MouseMoveEvent";
import PlayPauseEvent from "./PlayPauseEvent";

type PlayerEvent = ChangeTimeEvent | ChangeSolutionsEvent | PlayPauseEvent | MouseDownEvent | MouseMoveEvent;

export default PlayerEvent;
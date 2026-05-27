import ChangeTimeEvent from "./ChangeTimeEvent";
import ChangeSolutionsEvent from "./ChangeSolutionsEvent";
import MouseDownEvent from "./MouseDownEvent";
import MouseMoveEvent from "./MouseMoveEvent";
import MouseWheelEvent from "./MouseWheelEvent";
import NextCharacterEvent from "./NextCharacterEvent";
import PlayPauseEvent from "./PlayPauseEvent";

type PlayerEvent = ChangeTimeEvent | ChangeSolutionsEvent | NextCharacterEvent | PlayPauseEvent | MouseDownEvent | MouseMoveEvent | MouseWheelEvent;

export default PlayerEvent;
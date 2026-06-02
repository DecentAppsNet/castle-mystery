/* This module groups the player-event union over concrete UI-driven game events.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ChangeTimeEvent from "./ChangeTimeEvent";
import ChangeSolutionsEvent from "./ChangeSolutionsEvent";
import MouseDownEvent from "./MouseDownEvent";
import MouseMoveEvent from "./MouseMoveEvent";
import MouseWheelEvent from "./MouseWheelEvent";
import NextCharacterEvent from "./NextCharacterEvent";
import PlayPauseEvent from "./PlayPauseEvent";

type PlayerEvent = ChangeTimeEvent | ChangeSolutionsEvent | NextCharacterEvent | PlayPauseEvent | MouseDownEvent | MouseMoveEvent | MouseWheelEvent;

export default PlayerEvent;
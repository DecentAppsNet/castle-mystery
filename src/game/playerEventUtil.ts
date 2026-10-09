/* This module groups player-event queue helpers used to accumulate and consume UI-driven game actions.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ChangeTimeEvent from "./playerEvents/types/ChangeTimeEvent";
import ChangeConclusionsEvent from "./playerEvents/types/ChangeConclusionsEvent";
import PlayerEventType from "./playerEvents/types/PlayerEventType";
import PlayerEvent from "./playerEvents/types/PlayerEvent";
import PlayPauseEvent from "./playerEvents/types/PlayPauseEvent";
import MouseDownEvent from "./playerEvents/types/MouseDownEvent";
import MouseMoveEvent from "./playerEvents/types/MouseMoveEvent";
import MouseWheelEvent from "./playerEvents/types/MouseWheelEvent";
import NextCharacterEvent from "./playerEvents/types/NextCharacterEvent";
import Conclusion from "./conclusions/types/Conclusion";

let thePlayerEvents:PlayerEvent[] = [];

function _replaceOrAddEventOfType(events:PlayerEvent[], newEvent:PlayerEvent) {
  const eventIndex = events.findIndex(e => e.type === newEvent.type);
  if (eventIndex === -1) {
    events.push(newEvent);
  } else if (newEvent.type === PlayerEventType.MOUSEWHEEL) {
    const existingEvent = events[eventIndex] as MouseWheelEvent;
    const wheelEvent = newEvent as MouseWheelEvent;
    events[eventIndex] = { ...existingEvent, deltaY:existingEvent.deltaY + wheelEvent.deltaY };
  } else {
    events[eventIndex] = newEvent;
  }
}

export function changeTime(time:number) {
  const event:ChangeTimeEvent = {type:PlayerEventType.CHANGE_TIME, time};
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function playPause(isPlaying:boolean) {
  const event:PlayPauseEvent = {type:PlayerEventType.PLAY_PAUSE, isPlaying};
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function changeConclusions(conclusions:Conclusion[]) {
  const event:ChangeConclusionsEvent = { type:PlayerEventType.CHANGE_CONCLUSIONS, conclusions };
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function nextCharacter() {
  const event:NextCharacterEvent = { type:PlayerEventType.NEXT_CHARACTER };
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function mouseDown(x:number, y:number) {
  const event:MouseDownEvent = {type:PlayerEventType.MOUSEDOWN, x, y};
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function mouseMove(x:number, y:number) {
  const event:MouseMoveEvent = {type:PlayerEventType.MOUSEMOVE, x, y};
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function mouseWheel(deltaY:number) {
  const event:MouseWheelEvent = {type:PlayerEventType.MOUSEWHEEL, deltaY};
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function popPlayerEvents():PlayerEvent[] {
  const events = thePlayerEvents;
  thePlayerEvents = [];
  return events;
}

export function clearPlayerEvents() {
  thePlayerEvents = [];
}
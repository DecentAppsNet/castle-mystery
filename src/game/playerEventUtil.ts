import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";

let thePlayerEvents:PlayerEvent[] = [];

function _replaceOrAddEventOfType(events:PlayerEvent[], newEvent:PlayerEvent) {
  const eventIndex = events.findIndex(e => e.type === newEvent.type);
  if (eventIndex === -1) {
    events.push(newEvent);
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

export function mouseDown(x:number, y:number) {
  const event:MouseDownEvent = {type:PlayerEventType.MOUSEDOWN, x, y};
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function mouseMove(x:number, y:number) {
  const event:MouseMoveEvent = {type:PlayerEventType.MOUSEMOVE, x, y};
  _replaceOrAddEventOfType(thePlayerEvents, event);
}

export function popPlayerEvents():PlayerEvent[] {
  const events = thePlayerEvents;
  thePlayerEvents = [];
  return events;
}
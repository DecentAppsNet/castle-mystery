import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";

let thePlayerEvents:PlayerEvent[] = [];

export function changeTime(time:number) {
  const event:ChangeTimeEvent = {type:PlayerEventType.CHANGE_TIME, time};
  thePlayerEvents.push(event);
}

export function playPause(isPlaying:boolean) {
  const event:PlayPauseEvent = {type:PlayerEventType.PLAY_PAUSE, isPlaying};
  thePlayerEvents.push(event);
}

function _filterRedundantPlayerEvents(events:PlayerEvent[]):PlayerEvent[] {
  if (events.length < 2) return events;
  
  let lastChangeTimeEventI = -1;
  for(let i = events.length - 1; i >= 0; --i) {
    if (events[i].type === PlayerEventType.CHANGE_TIME) {
      lastChangeTimeEventI = i;
      break;
    }
  }

  if (lastChangeTimeEventI === -1) return events;
  return events.filter((e, i) => e.type !== PlayerEventType.CHANGE_TIME || i === lastChangeTimeEventI);
}

export function popPlayerEvents():PlayerEvent[] {
  const events = _filterRedundantPlayerEvents(thePlayerEvents);
  thePlayerEvents = [];
  return events;
}
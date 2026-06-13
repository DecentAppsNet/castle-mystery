/* This module groups shared activity scheduling helpers for timestamp validation and event placement.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { formatMsecsAsTimestamp } from "@/levelLoading/timestampUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";

import type ActivityTimestampType from "./types/ActivityTimestampType";
import type CharacterActivityState from "./types/CharacterActivityState";

function _shiftEventTimes(events:ItineraryEvent[], delta:number):ItineraryEvent[] {
  return events.map(event => ({ ...event, startTime:event.startTime + delta }) as ItineraryEvent);
}

export function calcBlockingDurationForScheduling(event:ItineraryEvent, timestampType:ActivityTimestampType):number {
  switch (event.type) {
    case ItineraryEventType.WALK:
      return event.duration;
    case ItineraryEventType.SPEECH:
    case ItineraryEventType.EMIT:
      return timestampType === 'after-previous-activity' ? event.duration : 0;
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
      return event.duration;
    default:
      return 0;
  }
}

export function calcActivityStartTime(state:CharacterActivityState, timestamp:number, timestampType:ActivityTimestampType):number {
  return timestampType === 'absolute' ? timestamp : Math.max(timestamp, state.time);
}

export function findEarliestAbsoluteActivityStartTime(state:CharacterActivityState):number {
  return state.events.reduce((blockingTime, event) =>
    Math.max(blockingTime, event.startTime + calcBlockingDurationForScheduling(event, 'absolute')), 0);
}

export function ensureTimestampIsAvailable(state:CharacterActivityState, timestamp:number, activityText:string, timestampType:ActivityTimestampType) {
  if (timestampType === 'absolute' && timestamp < findEarliestAbsoluteActivityStartTime(state)) {
    throw new Error(`unable to schedule itinerary activity '${activityText}' at ${timestamp}`);
  }
}

export function scheduleEventsToEndAtTime(events:ItineraryEvent[], timestamp:number, earliestStartTime:number, onUnavailableArrival?:(earliestArrivalTime:number) => string):ItineraryEvent[] {
  if (!events.length) {
    if (timestamp < earliestStartTime) throw new Error(`activity at ${timestamp} overlaps a previous itinerary activity`);
    return [];
  }
  const lastEvent = events[events.length - 1];
  assertNonNullable(lastEvent);
  const totalDuration = lastEvent.startTime + lastEvent.duration;
  const scheduledStartTime = timestamp - totalDuration;
  if (scheduledStartTime < earliestStartTime) {
    throw new Error(onUnavailableArrival?.(earliestStartTime + totalDuration)
      || `unable to arrive by itinerary timestamp ${formatMsecsAsTimestamp(timestamp)}`);
  }
  return _shiftEventTimes(events, scheduledStartTime);
}

export function scheduleEventsToStartAtTime(events:ItineraryEvent[], timestamp:number, earliestStartTime:number):ItineraryEvent[] {
  if (!events.length) {
    if (timestamp < earliestStartTime) throw new Error(`activity at ${timestamp} overlaps a previous itinerary activity`);
    return [];
  }
  const firstEvent = events[0];
  assertNonNullable(firstEvent);
  const scheduledStartTime = timestamp - firstEvent.startTime;
  if (scheduledStartTime < earliestStartTime) {
    throw new Error(`unable to start itinerary activity at ${timestamp}`);
  }
  return _shiftEventTimes(events, scheduledStartTime);
}
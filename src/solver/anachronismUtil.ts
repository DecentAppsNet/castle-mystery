/* Detects timeline anachronisms — a single character scheduled into two overlapping activities of the
  *same kind*: in two places at once (overlapping walks), or mid-two-of-one action (see
  docs/adr-solver.md). The level loader serializes a character's blocking activities, but
  ensureTimestampIsAvailable / findEarliestAbsoluteActivityStartTime
  (src/levelLoading/activities/activity/activitySchedulingUtil.ts) score SPEECH/EMIT as non-blocking
  for *absolute* timestamps. So a run of relative ':' speeches can advance a character's clock, and a
  later absolute arrival can then back-plan *before* an earlier arrival completes with no load error —
  leaving two overlapping walks (the character occupying two places at once). We catch that here.

  Overlap is checked per *activity channel*, not across all activities: a character may legitimately
  speak (or emit a sound) while walking — authored levels do exactly this — so the audible channels and
  the movement channel are independent. An anachronism is two events in the SAME channel overlapping.
  Channels:
    - movement: WALK                          (can't be in two places at once)
    - speech:   SPEECH                         (one audible line at a time; the loader already enforces)
    - emit:     EMIT                           (one emitted sound at a time)
    - hands:    TAKE_ITEM / DROP_ITEM / GIVE_ITEM (one manipulation at a time)
  FACE / BODY_ORIENTATION / ROOM_ENTRY / DIE are zero-duration markers, THOUGHT is a silent thought,
  and CHARACTER_ENCOUNTER is a derived co-presence span — none occupy a channel, so they are excluded.
  This module depends on @/game/* only, like the rest of the solver. */

import Character from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import TimelineAnachronism, { AnachronismActivity } from "./types/TimelineAnachronism";

const CHANNEL_BY_EVENT_TYPE = new Map<string, string>([
  [ItineraryEventType.WALK, 'movement'],
  [ItineraryEventType.SPEECH, 'speech'],
  [ItineraryEventType.EMIT, 'emit'],
  [ItineraryEventType.TAKE_ITEM, 'hands'],
  [ItineraryEventType.DROP_ITEM, 'hands'],
  [ItineraryEventType.GIVE_ITEM, 'hands']
]);

function _channelOfEvent(event:ItineraryEvent):string|null {
  if (event.duration <= 0) return null;
  return CHANNEL_BY_EVENT_TYPE.get(event.type) ?? null;
}

function _toActivity(event:ItineraryEvent):AnachronismActivity {
  return { type:event.type, startTime:event.startTime, endTime:event.startTime + event.duration };
}

function _eventsByChannel(character:Character):Map<string, ItineraryEvent[]> {
  const byChannel = new Map<string, ItineraryEvent[]>();
  character.itinerary.forEach(event => {
    const channel = _channelOfEvent(event);
    if (!channel) return;
    const events = byChannel.get(channel) ?? [];
    events.push(event);
    byChannel.set(channel, events);
  });
  return byChannel;
}

function _findChannelAnachronisms(character:Character, events:ItineraryEvent[]):TimelineAnachronism[] {
  const sorted = events.slice().sort((event1, event2) => event1.startTime - event2.startTime || event1.duration - event2.duration);

  const anachronisms:TimelineAnachronism[] = [];
  let inProgress:ItineraryEvent|null = null; // The same-channel activity whose span extends furthest so far.
  sorted.forEach(event => {
    const earlier = inProgress;
    if (earlier && event.startTime < earlier.startTime + earlier.duration) {
      const earlierActivity = _toActivity(earlier), laterActivity = _toActivity(event);
      anachronisms.push({
        characterId:character.id,
        characterTitle:character.title,
        occupying:earlierActivity,
        conflicting:laterActivity,
        overlapMsecs:Math.min(earlierActivity.endTime, laterActivity.endTime) - laterActivity.startTime
      });
    }
    if (!earlier || event.startTime + event.duration > earlier.startTime + earlier.duration) inProgress = event;
  });
  return anachronisms;
}

function _findCharacterAnachronisms(character:Character):TimelineAnachronism[] {
  return [..._eventsByChannel(character).values()].flatMap(events => _findChannelAnachronisms(character, events));
}

export function findTimelineAnachronisms(characters:Character[]):TimelineAnachronism[] {
  return characters.flatMap(_findCharacterAnachronisms);
}

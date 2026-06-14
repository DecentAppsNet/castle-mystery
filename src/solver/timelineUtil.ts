/* Shared solver timeline helper (see docs/adr-solver.md).

  findTimelineEndTime() is the time at which the last itinerary event of any character completes — the
  level's final settled configuration, where every character rests in the room they last entered. The
  co-presence sampler (characterGraphUtil) and the room-occupancy sampler (roomOccupancyUtil) both
  include this time so a *touring* character's final room is observed: a character's last ROOM_ENTRY
  tick resolves (via findCharacterPose at that exact instant) to the room they are leaving, not the one
  they are entering, so without an end-of-timeline sample the final room of a tour is never sampled and
  whoever waits there looks unreachable. */

import Character from "@/game/types/Character";

export function findTimelineEndTime(characters:Character[], startTime:number):number {
  let endTime = startTime;
  characters.forEach(character => character.itinerary.forEach(event => {
    endTime = Math.max(endTime, event.startTime + event.duration);
  }));
  return endTime;
}

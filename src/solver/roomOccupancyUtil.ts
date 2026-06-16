/* Shared solver helper (see docs/adr-solver.md). Both the item-reachability graph and the
  room-layer cube replay the level's timeline and need the same two things, so they live here
  rather than being duplicated:

  - createRoomOccupancyByRoomId(gameState): for a game-state snapshot already rebuilt to a specific
    time, which characters and which items occupy each room. A character's room is resolved from its
    position; an item's room is the room it sits in, or the room of the character holding it.
  - collectRoomOccupancyChangeTimes(level): the sample times at which that occupancy can change — the
    level start, plus every ROOM_ENTRY (a character changes room) and every TAKE/DROP/GIVE (an item
    changes room), plus the timeline end (findTimelineEndTime), the final settled configuration. The
    end sample is what captures the final room of a tour: a character's last ROOM_ENTRY tick resolves
    to the room being left, so without it an item witnessed only in that final room looks unreachable
    (mirrors the co-presence sampler in characterGraphUtil). */

import { getOwnedItems } from "@/game/itemOwnershipUtil";
import { findRoomAtPosition } from "@/game/roomUtil";
import GameState from "@/game/types/GameState";
import Level from "@/game/types/Level";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import { findTimelineEndTime } from "./timelineUtil";

export type RoomOccupancy = { characterIds:string[], itemIds:string[] };

function _createRoomIdByCharacterId(gameState:Pick<GameState, 'characters' | 'rooms'>):Map<string, string|null> {
  const roomIdByCharacterId = new Map<string, string|null>();
  gameState.characters.forEach(character => {
    const room = findRoomAtPosition(gameState.rooms, character.position.x, character.position.y);
    roomIdByCharacterId.set(character.id, room ? room.id : null);
  });
  return roomIdByCharacterId;
}

export function createRoomOccupancyByRoomId(gameState:Pick<GameState, 'characters' | 'rooms'>):Map<string, RoomOccupancy> {
  const roomIdByCharacterId = _createRoomIdByCharacterId(gameState);
  const occupancyByRoomId = new Map<string, RoomOccupancy>();
  const ensureRoom = (roomId:string):RoomOccupancy => {
    let occupancy = occupancyByRoomId.get(roomId);
    if (!occupancy) { occupancy = { characterIds:[], itemIds:[] }; occupancyByRoomId.set(roomId, occupancy); }
    return occupancy;
  };

  roomIdByCharacterId.forEach((roomId, characterId) => { if (roomId) ensureRoom(roomId).characterIds.push(characterId); });
  gameState.rooms.forEach(room => room.items.forEach(item => ensureRoom(room.id).itemIds.push(item.id)));
  gameState.characters.forEach(character => {
    const roomId = roomIdByCharacterId.get(character.id) ?? null;
    if (!roomId) return;
    getOwnedItems(character).forEach(item => ensureRoom(roomId).itemIds.push(item.id));
  });
  return occupancyByRoomId;
}

export function collectRoomOccupancyChangeTimes(level:Pick<Level, 'startTime' | 'characters'>):number[] {
  const times = new Set<number>([level.startTime, findTimelineEndTime(level.characters, level.startTime)]);
  level.characters.forEach(character => character.itinerary.forEach(event => {
    switch (event.type) {
      case ItineraryEventType.ROOM_ENTRY:
      case ItineraryEventType.TAKE_ITEM:
      case ItineraryEventType.DROP_ITEM:
      case ItineraryEventType.GIVE_ITEM:
        times.add(event.startTime);
        break;
    }
  }));
  return [...times].sort((time1, time2) => time1 - time2);
}

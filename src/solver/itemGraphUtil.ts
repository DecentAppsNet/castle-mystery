/* This module builds the item-reachability graph for a level (see docs/adr-solver.md).

  A node is an item that is actually placed in the level (in a room or held by a character).
  level.itemsById is unsuitable as the node source because it also carries imported-but-unplaced
  definitions (items.md is shared across levels), so we enumerate placed items via createItemsById.

  An item's room changes over the timeline (characters take, drop, and give items), so we resolve
  item locations the same way the running game does: build a GameState and replay it with
  rebuildDynamicStateForTime() at each sample time. Sampling at the level start plus every ROOM_ENTRY
  and item-movement (TAKE/DROP/GIVE) tick captures every room-occupancy configuration. At each sample
  we record, for every item, which characters share its room — its "witnesses". */

import { rebuildDynamicStateForTime } from "@/game/dynamicStateRebuildUtil";
import { createGameState } from "@/game/gameUtil";
import { getOwnedItems } from "@/game/itemOwnershipUtil";
import { createItemsById } from "@/game/itemUtil";
import { findRoomAtPosition } from "@/game/roomUtil";
import GameState from "@/game/types/GameState";
import Item from "@/game/types/Item";
import Level from "@/game/types/Level";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import CharacterGraph from "./types/CharacterGraph";
import ReachabilityResult from "./types/ReachabilityResult";
import ItemGraph, { ItemGraphCharacterColumn, ItemGraphNode } from "./types/ItemGraph";

function _compareIds(id1:string, id2:string):number {
  return id1.localeCompare(id2);
}

function _createPlacedItems(level:Level):Item[] {
  return [...createItemsById(level.rooms, level.characters).values()];
}

function _collectSampleTimes(level:Level):number[] {
  const times = new Set<number>([level.startTime]);
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

function _createRoomIdByCharacterId(gameState:GameState):Map<string, string|null> {
  const roomIdByCharacterId = new Map<string, string|null>();
  gameState.characters.forEach(character => {
    const room = findRoomAtPosition(gameState.rooms, character.position.x, character.position.y);
    roomIdByCharacterId.set(character.id, room ? room.id : null);
  });
  return roomIdByCharacterId;
}

function _createCharacterIdsByRoomId(roomIdByCharacterId:Map<string, string|null>):Map<string, string[]> {
  const characterIdsByRoomId = new Map<string, string[]>();
  roomIdByCharacterId.forEach((roomId, characterId) => {
    if (!roomId) return;
    const ids = characterIdsByRoomId.get(roomId) ?? [];
    ids.push(characterId);
    characterIdsByRoomId.set(roomId, ids);
  });
  return characterIdsByRoomId;
}

function _addWitnessesAtTime(gameState:GameState, witnessesByItemId:Map<string, Set<string>>) {
  const roomIdByCharacterId = _createRoomIdByCharacterId(gameState);
  const characterIdsByRoomId = _createCharacterIdsByRoomId(roomIdByCharacterId);

  const addItemWitnesses = (itemId:string, roomId:string|null) => {
    const witnesses = witnessesByItemId.get(itemId); // null for unplaced definitions we don't track.
    if (!witnesses || !roomId) return;
    (characterIdsByRoomId.get(roomId) ?? []).forEach(characterId => witnesses.add(characterId));
  };

  gameState.rooms.forEach(room => room.items.forEach(item => addItemWitnesses(item.id, room.id)));
  gameState.characters.forEach(character =>
    getOwnedItems(character).forEach(item => addItemWitnesses(item.id, roomIdByCharacterId.get(character.id) ?? null)));
}

function _collectWitnessesByItemId(level:Level, placedItems:Item[]):Map<string, Set<string>> {
  const witnessesByItemId = new Map<string, Set<string>>();
  placedItems.forEach(item => witnessesByItemId.set(item.id, new Set<string>()));

  const gameState = createGameState(level);
  _collectSampleTimes(level).forEach(time => {
    rebuildDynamicStateForTime(gameState, time);
    _addWitnessesAtTime(gameState, witnessesByItemId);
  });
  return witnessesByItemId;
}

export function buildItemGraphForLevel(level:Level, characterGraph:CharacterGraph, reachability:ReachabilityResult):ItemGraph {
  const reachableCharacterIds = new Set(reachability.reachableIds);
  const characterColumns:ItemGraphCharacterColumn[] = characterGraph.nodes.map(node =>
    ({ id:node.id, title:node.title, isReachable:reachableCharacterIds.has(node.id) }));

  const placedItems = _createPlacedItems(level);
  const witnessesByItemId = _collectWitnessesByItemId(level, placedItems);
  const nodes:ItemGraphNode[] = placedItems
    .map(item => ({
      id:item.id,
      title:item.title,
      witnessCharacterIds:[...(witnessesByItemId.get(item.id) ?? new Set<string>())].sort(_compareIds)
    }))
    .sort((node1, node2) => _compareIds(node1.id, node2.id));

  return { nodes, characterColumns };
}

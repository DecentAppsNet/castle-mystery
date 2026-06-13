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
import { createItemsById } from "@/game/itemUtil";
import GameState from "@/game/types/GameState";
import Item from "@/game/types/Item";
import Level from "@/game/types/Level";
import { collectRoomOccupancyChangeTimes, createRoomOccupancyByRoomId } from "./roomOccupancyUtil";
import CharacterGraph from "./types/CharacterGraph";
import ReachabilityResult from "./types/ReachabilityResult";
import ItemGraph, { ItemGraphCharacterColumn, ItemGraphNode } from "./types/ItemGraph";

function _compareIds(id1:string, id2:string):number {
  return id1.localeCompare(id2);
}

function _createPlacedItems(level:Level):Item[] {
  return [...createItemsById(level.rooms, level.characters).values()];
}

function _addWitnessesAtTime(gameState:GameState, witnessesByItemId:Map<string, Set<string>>) {
  createRoomOccupancyByRoomId(gameState).forEach(occupancy => {
    occupancy.itemIds.forEach(itemId => {
      const witnesses = witnessesByItemId.get(itemId); // null for unplaced definitions we don't track.
      if (!witnesses) return;
      occupancy.characterIds.forEach(characterId => witnesses.add(characterId));
    });
  });
}

function _collectWitnessesByItemId(level:Level, placedItems:Item[]):Map<string, Set<string>> {
  const witnessesByItemId = new Map<string, Set<string>>();
  placedItems.forEach(item => witnessesByItemId.set(item.id, new Set<string>()));

  const gameState = createGameState(level);
  collectRoomOccupancyChangeTimes(level).forEach(time => {
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

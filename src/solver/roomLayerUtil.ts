/* This module builds the room-interaction cube's data (see docs/adr-solver.md). It re-bins the same
  character/item co-presence the other two graphs use, but per room instead of aggregated, so each
  room can be rendered as one layer of an isometric cube.

  Like the item-reachability graph it resolves item locations the way the running game does — build a
  GameState and replay it with rebuildDynamicStateForTime() at each occupancy-change time. At each
  sample, every room's occupants (characters + items) are recorded, and every character×item pair
  sharing that room is recorded as an interaction. The character/item indices are taken from the
  already-built graphs so the cube lines up with their legends. */

import { rebuildDynamicStateForTime } from "@/game/dynamicStateRebuildUtil";
import { createGameState } from "@/game/gameUtil";
import Level from "@/game/types/Level";
import { collectRoomOccupancyChangeTimes, createRoomOccupancyByRoomId } from "./roomOccupancyUtil";
import CharacterGraph from "./types/CharacterGraph";
import ItemGraph from "./types/ItemGraph";
import RoomLayerView, { RoomLayer, RoomLayerInteraction } from "./types/RoomLayerView";

// firstTimeByKey maps a `${characterIndex}|${itemIndex}` pair to the earliest sampled time the two
// shared the room. Because sample times are visited in ascending order, the first write per key wins.
type RoomAccumulator = { characterIndices:Set<number>, itemIndices:Set<number>, firstTimeByKey:Map<string, number> };

function _createAccumulator():RoomAccumulator {
  return { characterIndices:new Set(), itemIndices:new Set(), firstTimeByKey:new Map() };
}

function _createIndexById(ids:string[]):Map<string, number> {
  return new Map(ids.map((id, index) => [id, index]));
}

function _createAccumulatorsByRoomId(level:Level):Map<string, RoomAccumulator> {
  const accumulatorsByRoomId = new Map<string, RoomAccumulator>();
  level.rooms.forEach(room => accumulatorsByRoomId.set(room.id, _createAccumulator()));
  return accumulatorsByRoomId;
}

function _resolveIndices(ids:string[], indexById:Map<string, number>):number[] {
  return ids.map(id => indexById.get(id)).filter((index):index is number => index !== undefined);
}

function _accumulateOccupancy(level:Level, characterIndexById:Map<string, number>, itemIndexById:Map<string, number>):Map<string, RoomAccumulator> {
  const accumulatorsByRoomId = _createAccumulatorsByRoomId(level);
  const gameState = createGameState(level);
  collectRoomOccupancyChangeTimes(level).forEach(time => {
    rebuildDynamicStateForTime(gameState, time);
    createRoomOccupancyByRoomId(gameState).forEach((occupancy, roomId) => {
      const accumulator = accumulatorsByRoomId.get(roomId);
      if (!accumulator) return; // A room not declared in level.rooms; shouldn't happen.
      const characterIndices = _resolveIndices(occupancy.characterIds, characterIndexById);
      const itemIndices = _resolveIndices(occupancy.itemIds, itemIndexById);
      characterIndices.forEach(characterIndex => accumulator.characterIndices.add(characterIndex));
      itemIndices.forEach(itemIndex => accumulator.itemIndices.add(itemIndex));
      characterIndices.forEach(characterIndex => itemIndices.forEach(itemIndex => {
        const key = `${characterIndex}|${itemIndex}`;
        if (!accumulator.firstTimeByKey.has(key)) accumulator.firstTimeByKey.set(key, time);
      }));
    });
  });
  return accumulatorsByRoomId;
}

function _toRoomLayer(roomId:string, title:string, gridRow:number, gridCol:number, accumulator:RoomAccumulator):RoomLayer {
  const characterIndices = [...accumulator.characterIndices].sort((index1, index2) => index1 - index2);
  const itemIndices = [...accumulator.itemIndices].sort((index1, index2) => index1 - index2);
  const interactions:RoomLayerInteraction[] = [...accumulator.firstTimeByKey.entries()]
    .map(([key, firstInteractionTime]) => { const [characterIndex, itemIndex] = key.split('|'); return { characterIndex:Number(characterIndex), itemIndex:Number(itemIndex), firstInteractionTime }; })
    .sort((pair1, pair2) => pair1.characterIndex - pair2.characterIndex || pair1.itemIndex - pair2.itemIndex);
  return { roomId, title, gridRow, gridCol, characterIndices, itemIndices, interactions };
}

// The room grid follows the level map: a room's left edge (rect.x) ranks its column and its top edge
// (rect.y) ranks its row, so rooms sharing a map column/row line up. Rooms spanning several map tiles
// are placed by their top-left tile.
function _createGridRanker(values:number[]):Map<number, number> {
  const sorted = [...new Set(values)].sort((value1, value2) => value1 - value2);
  return new Map(sorted.map((value, index) => [value, index]));
}

export function buildRoomLayerView(level:Level, characterGraph:CharacterGraph, itemGraph:ItemGraph):RoomLayerView {
  const characterIndexById = _createIndexById(characterGraph.nodes.map(node => node.id));
  const itemIndexById = _createIndexById(itemGraph.nodes.map(node => node.id));
  const accumulatorsByRoomId = _accumulateOccupancy(level, characterIndexById, itemIndexById);

  const gridColByX = _createGridRanker(level.rooms.map(room => room.rect.x));
  const gridRowByY = _createGridRanker(level.rooms.map(room => room.rect.y));
  const rooms = level.rooms.map(room =>
    _toRoomLayer(room.id, room.title, gridRowByY.get(room.rect.y) ?? 0, gridColByX.get(room.rect.x) ?? 0,
      accumulatorsByRoomId.get(room.id) ?? _createAccumulator()));

  return {
    rooms,
    characterLabels:characterGraph.nodes.map(node => node.title),
    itemLabels:itemGraph.nodes.map(node => node.title)
  };
}

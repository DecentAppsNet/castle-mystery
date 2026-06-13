/* Entry point for the level solver (see docs/adr-solver.md). solveLevel() builds the character
  co-presence graph and the item-reachability graph, evaluates reachability for each, and renders
  the always-on ASCII view (character graph, then item graph, then the per-room interaction cube),
  returning everything in one SolveResult. The level passes only when both reachability checks pass
  (the cube is a visualization and does not affect `ok`). The scripts/solve.ts CLI and any
  programmatic caller share this single path. */

import Level from "@/game/types/Level";
import { buildCharacterGraphForLevel } from "./characterGraphUtil";
import { renderCharacterGraphAscii } from "./graphSerializeUtil";
import { buildItemGraphForLevel } from "./itemGraphUtil";
import { renderItemGraphAscii } from "./itemGraphSerializeUtil";
import { evaluateItemReachability } from "./itemReachabilityUtil";
import { buildRoomLayerView } from "./roomLayerUtil";
import { renderRoomLayerCubeAscii } from "./roomLayerSerializeUtil";
import { evaluateReachability } from "./reachabilityUtil";
import SolveResult from "./types/SolveResult";

export function solveLevel(level:Level, levelName:string|null = null):SolveResult {
  const graph = buildCharacterGraphForLevel(level);
  const reachability = evaluateReachability(graph, level.activeCharacterId);
  const itemGraph = buildItemGraphForLevel(level, graph, reachability);
  const itemReachability = evaluateItemReachability(itemGraph);
  const roomLayers = buildRoomLayerView(level, graph, itemGraph);
  // graphsAscii (the adjacency + item matrices that carry the PASS/FAIL verdict) and roomLayerAscii
  // (the wide diagnostic cube) are kept separate so a caller can place them independently; asciiArt
  // is their combined convenience render.
  const graphsAscii = `${renderCharacterGraphAscii(graph, reachability, levelName)}\n${renderItemGraphAscii(itemGraph, itemReachability, levelName)}`;
  const roomLayerAscii = renderRoomLayerCubeAscii(roomLayers, levelName);
  const asciiArt = `${graphsAscii}\n${roomLayerAscii}`;
  return { levelName, graph, reachability, itemGraph, itemReachability, roomLayers, graphsAscii, roomLayerAscii, asciiArt, ok:reachability.ok && itemReachability.ok };
}

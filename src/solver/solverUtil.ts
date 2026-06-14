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
import { buildTransferCostTable } from "./transferCostUtil";
import { renderTransferCostTableAscii } from "./transferCostSerializeUtil";
import SolveResult from "./types/SolveResult";

export function solveLevel(level:Level, levelName:string|null = null):SolveResult {
  const graph = buildCharacterGraphForLevel(level);
  const reachability = evaluateReachability(graph, level.activeCharacterId);
  const itemGraph = buildItemGraphForLevel(level, graph, reachability);
  const itemReachability = evaluateItemReachability(itemGraph);
  const transferCostTable = buildTransferCostTable(graph, itemGraph);
  const roomLayers = buildRoomLayerView(level, graph, itemGraph);
  // analysisAscii is the always-shown analysis — the adjacency + item matrices (which carry the
  // PASS/FAIL verdict) followed by the item-access-cost table (level complexity). roomLayerAscii is
  // the wide, "nice to have" diagnostic cube, kept separate so a caller can place/divert it on its
  // own. asciiArt is their combined convenience render, in display order.
  const analysisAscii = `${renderCharacterGraphAscii(graph, reachability, levelName)}\n${renderItemGraphAscii(itemGraph, itemReachability, levelName)}\n${renderTransferCostTableAscii(transferCostTable, levelName)}`;
  const roomLayerAscii = renderRoomLayerCubeAscii(roomLayers, levelName);
  const asciiArt = `${analysisAscii}\n${roomLayerAscii}`;
  return { levelName, graph, reachability, itemGraph, itemReachability, transferCostTable, roomLayers, analysisAscii, roomLayerAscii, asciiArt, ok:reachability.ok && itemReachability.ok };
}

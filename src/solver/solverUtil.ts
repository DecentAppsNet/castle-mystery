/* Entry point for the level solver (see docs/adr-solver.md). solveLevel() builds the character
  co-presence graph and the item-reachability graph, evaluates reachability for each, and renders
  the always-on ASCII view (characters then items), returning everything in one SolveResult. The
  level passes only when both checks pass. The scripts/solve.ts CLI and any programmatic caller
  share this single path. */

import Level from "@/game/types/Level";
import { buildCharacterGraphForLevel } from "./characterGraphUtil";
import { renderCharacterGraphAscii } from "./graphSerializeUtil";
import { buildItemGraphForLevel } from "./itemGraphUtil";
import { renderItemGraphAscii } from "./itemGraphSerializeUtil";
import { evaluateItemReachability } from "./itemReachabilityUtil";
import { evaluateReachability } from "./reachabilityUtil";
import SolveResult from "./types/SolveResult";

export function solveLevel(level:Level, levelName:string|null = null):SolveResult {
  const graph = buildCharacterGraphForLevel(level);
  const reachability = evaluateReachability(graph, level.activeCharacterId);
  const itemGraph = buildItemGraphForLevel(level, graph, reachability);
  const itemReachability = evaluateItemReachability(itemGraph);
  const asciiArt = `${renderCharacterGraphAscii(graph, reachability, levelName)}\n${renderItemGraphAscii(itemGraph, itemReachability, levelName)}`;
  return { levelName, graph, reachability, itemGraph, itemReachability, asciiArt, ok:reachability.ok && itemReachability.ok };
}

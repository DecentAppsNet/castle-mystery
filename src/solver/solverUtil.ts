/* Entry point for the level solver (see docs/adr-solver.md). solveLevel() builds the character
  co-presence graph, evaluates reachability from the player's starting actor, and renders the
  always-on ASCII view, returning everything in one SolveResult. The scripts/solve.ts CLI and any
  programmatic caller share this single path. */

import Level from "@/game/types/Level";
import { buildCharacterGraphForLevel } from "./characterGraphUtil";
import { renderCharacterGraphAscii } from "./graphSerializeUtil";
import { evaluateReachability } from "./reachabilityUtil";
import SolveResult from "./types/SolveResult";

export function solveLevel(level:Level, levelName:string|null = null):SolveResult {
  const graph = buildCharacterGraphForLevel(level);
  const reachability = evaluateReachability(graph, level.activeCharacterId);
  const asciiArt = renderCharacterGraphAscii(graph, reachability, levelName);
  return { levelName, graph, reachability, asciiArt };
}

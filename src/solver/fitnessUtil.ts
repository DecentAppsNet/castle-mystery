/* Distils a SolveResult into the machine-readable LevelFitness the generative level designer optimizes
  against: the structural gate booleans (reachability) plus integer complexity aggregates derived from
  the transfer-cost table (how many time-respecting character switches the player needs to reach each
  item). The solver already exposes per-pair costs and per-check verdicts; this only aggregates them
  into the stable contract emitted by scripts/evaluateLevel.ts. See
  docs/design/world-gen-generative-level-design.md and docs/adr-solver.md. */

import { anachronismsToJsonObject } from "./anachronismSerializeUtil";
import SolveResult from "./types/SolveResult";
import TransferCostTable from "./types/TransferCostTable";
import LevelFitness, { ComplexityMetrics } from "./types/LevelFitness";

function _round2(value:number):number {
  return Math.round(value * 100) / 100;
}

function _computeComplexityMetrics(table:TransferCostTable):ComplexityMetrics {
  const totalPairCount = table.rows.length * table.items.length;
  const finiteCosts:number[] = [];
  const costHistogram:Record<string, number> = {};
  table.rows.forEach(row => row.cells.forEach(cell => {
    if (cell.cost === null) return;
    finiteCosts.push(cell.cost);
    const key = String(cell.cost);
    costHistogram[key] = (costHistogram[key] ?? 0) + 1;
  }));
  const reachablePairCount = finiteCosts.length;
  const hasReachable = reachablePairCount > 0;
  return {
    totalPairCount,
    reachablePairCount,
    unreachablePairCount: totalPairCount - reachablePairCount,
    maxCost: hasReachable ? Math.max(...finiteCosts) : null,
    meanCost: hasReachable ? _round2(finiteCosts.reduce((sum, cost) => sum + cost, 0) / reachablePairCount) : null,
    costHistogram
  };
}

export function buildLevelFitness(solveResult:SolveResult):LevelFitness {
  const { reachability, itemReachability, transferCostTable, anachronisms } = solveResult;
  return {
    levelName: solveResult.levelName,
    gates: {
      charactersReachable: reachability.ok,
      itemsReachable: itemReachability.ok,
      noAnachronisms: anachronisms.length === 0,
      ok: solveResult.ok
    },
    counts: {
      characters: transferCostTable.rows.length,
      items: transferCostTable.items.length
    },
    unreachable: {
      characterIds: reachability.unreachableIds,
      itemIds: itemReachability.unreachableItemIds
    },
    anachronisms: anachronismsToJsonObject(anachronisms, solveResult.levelName).anachronisms,
    complexity: _computeComplexityMetrics(transferCostTable)
  };
}

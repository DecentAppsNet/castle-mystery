// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { buildLevelFitness } from '../fitnessUtil';
import SolveResult from '../types/SolveResult';
import ReachabilityResult from '../types/ReachabilityResult';
import ItemReachabilityResult from '../types/ItemReachabilityResult';
import TransferCostTable, { TransferCostRow } from '../types/TransferCostTable';

function _reachability(unreachableIds:string[]):ReachabilityResult {
  return { startId:'start', startExists:true, reachableIds:[], unreachableIds, ok:unreachableIds.length === 0 };
}

function _itemReachability(unreachableItemIds:string[]):ItemReachabilityResult {
  return { reachableItemIds:[], unreachableItemIds, ok:unreachableItemIds.length === 0 };
}

function _row(characterId:string, costs:Array<number|null>):TransferCostRow {
  return { characterId, characterTitle:characterId.toUpperCase(), cells:costs.map(cost => ({ cost, switches:[] })) };
}

function _table(itemIds:string[], rows:TransferCostRow[]):TransferCostTable {
  return { items:itemIds.map(id => ({ id, title:id.toUpperCase() })), rows };
}

// Fills the SolveResult fields buildLevelFitness ignores (graph/itemGraph/roomLayers/ASCII) with empty
// stubs, so a test only states the reachability + transfer-cost pieces that drive fitness.
function _solveResult(args:{
  levelName?:string|null,
  reachability:ReachabilityResult,
  itemReachability:ItemReachabilityResult,
  transferCostTable:TransferCostTable
}):SolveResult {
  return {
    levelName:args.levelName ?? 'test-level',
    graph:{ directed:false, nodes:[], edges:[] },
    reachability:args.reachability,
    itemGraph:{ nodes:[], characterColumns:[] },
    itemReachability:args.itemReachability,
    transferCostTable:args.transferCostTable,
    roomLayers:{ rooms:[], characterLabels:[], itemLabels:[] },
    anachronisms:[],
    analysisAscii:'', roomLayerAscii:'', asciiArt:'',
    ok:args.reachability.ok && args.itemReachability.ok
  };
}

describe('fitnessUtil', () => {
  describe('buildLevelFitness()', () => {
    it('aggregates per-pair costs into max/mean/histogram for a fully reachable level', () => {
      const fitness = buildLevelFitness(_solveResult({
        reachability:_reachability([]),
        itemReachability:_itemReachability([]),
        transferCostTable:_table(['knife', 'goblet'], [_row('alice', [0, 1]), _row('bob', [1, 2])])
      }));
      expect(fitness.gates).toEqual({ charactersReachable:true, itemsReachable:true, noAnachronisms:true, ok:true });
      expect(fitness.anachronisms).toEqual([]);
      expect(fitness.counts).toEqual({ characters:2, items:2 });
      expect(fitness.complexity).toEqual({
        totalPairCount:4,
        reachablePairCount:4,
        unreachablePairCount:0,
        maxCost:2,
        meanCost:1,
        costHistogram:{ '0':1, '1':2, '2':1 }
      });
    });

    it('counts null-cost pairs as unreachable and excludes them from max/mean', () => {
      const fitness = buildLevelFitness(_solveResult({
        reachability:_reachability([]),
        itemReachability:_itemReachability(['goblet']),
        transferCostTable:_table(['knife', 'goblet'], [_row('alice', [0, null]), _row('bob', [1, null])])
      }));
      expect(fitness.gates.itemsReachable).toBe(false);
      expect(fitness.gates.ok).toBe(false);
      expect(fitness.unreachable.itemIds).toEqual(['goblet']);
      expect(fitness.complexity).toEqual({
        totalPairCount:4,
        reachablePairCount:2,
        unreachablePairCount:2,
        maxCost:1,
        meanCost:0.5,
        costHistogram:{ '0':1, '1':1 }
      });
    });

    it('reports null aggregates when no pair is reachable', () => {
      const fitness = buildLevelFitness(_solveResult({
        reachability:_reachability([]),
        itemReachability:_itemReachability(['knife']),
        transferCostTable:_table(['knife'], [_row('alice', [null]), _row('bob', [null])])
      }));
      expect(fitness.complexity).toEqual({
        totalPairCount:2,
        reachablePairCount:0,
        unreachablePairCount:2,
        maxCost:null,
        meanCost:null,
        costHistogram:{}
      });
    });

    it('produces a vacuous complexity for a level with no items', () => {
      const fitness = buildLevelFitness(_solveResult({
        reachability:_reachability([]),
        itemReachability:_itemReachability([]),
        transferCostTable:_table([], [_row('alice', []), _row('bob', [])])
      }));
      expect(fitness.counts).toEqual({ characters:2, items:0 });
      expect(fitness.complexity).toEqual({
        totalPairCount:0,
        reachablePairCount:0,
        unreachablePairCount:0,
        maxCost:null,
        meanCost:null,
        costHistogram:{}
      });
    });

    it('passes through unreachable character ids and reflects gate failure', () => {
      const fitness = buildLevelFitness(_solveResult({
        reachability:_reachability(['carol']),
        itemReachability:_itemReachability([]),
        transferCostTable:_table(['knife'], [_row('alice', [0]), _row('bob', [1]), _row('carol', [null])])
      }));
      expect(fitness.gates.charactersReachable).toBe(false);
      expect(fitness.gates.ok).toBe(false);
      expect(fitness.unreachable.characterIds).toEqual(['carol']);
    });

    it('rounds mean cost to two decimals', () => {
      const fitness = buildLevelFitness(_solveResult({
        reachability:_reachability([]),
        itemReachability:_itemReachability([]),
        transferCostTable:_table(['relic'], [_row('x', [0]), _row('y', [1]), _row('z', [1])])
      }));
      expect(fitness.complexity.meanCost).toBe(0.67); // (0 + 1 + 1) / 3 = 0.6666…
    });
  });
});

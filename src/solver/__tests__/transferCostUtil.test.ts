// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { buildTransferCostTable } from '../transferCostUtil';
import CharacterGraph, { CharacterGraphEdge, CharacterGraphNode } from '../types/CharacterGraph';
import ItemGraph, { ItemGraphNode } from '../types/ItemGraph';

function _node(id:string):CharacterGraphNode {
  return { id, title:id.toUpperCase(), isTitleKnown:true, isActiveStart:false };
}

function _edge(sourceId:string, targetId:string, times:number[]):CharacterGraphEdge {
  return { sourceId, targetId, directed:false, coPresences:times.map(time => ({ time, roomId:'room' })) };
}

// alice — bob — carol chain; dave is isolated. alice & bob are co-present at 100 and 300, bob & carol
// only at 200 — so alice -> carol must switch to bob at 100 then carol at 200 (non-decreasing), while
// carol -> alice switches to bob at 200 then alice at 300 (the later alice/bob co-presence).
const T_AB_EARLY = 100, T_BC = 200, T_AB_LATE = 300;
const CHARACTER_GRAPH:CharacterGraph = {
  directed:false,
  nodes:[_node('alice'), _node('bob'), _node('carol'), _node('dave')],
  edges:[_edge('alice', 'bob', [T_AB_EARLY, T_AB_LATE]), _edge('bob', 'carol', [T_BC])]
};

function _item(id:string, witnessCharacterIds:string[]):ItemGraphNode {
  return { id, title:id.toUpperCase(), witnessCharacterIds };
}

const ITEM_GRAPH:ItemGraph = {
  nodes:[
    _item('knife', ['alice']),   // alice witnesses directly.
    _item('goblet', ['carol']),  // two switches away from alice.
    _item('relic', ['dave'])     // only the isolated dave witnesses it.
  ],
  characterColumns:[]
};

describe('transferCostUtil', () => {
  describe('buildTransferCostTable()', () => {
    it('reports the fewest time-respecting switches from each character to each item, null when unreachable', () => {
      const table = buildTransferCostTable(CHARACTER_GRAPH, ITEM_GRAPH);

      expect(table.items.map(item => item.id)).toEqual(['knife', 'goblet', 'relic']);
      const aliceRow = table.rows.find(row => row.characterId === 'alice');
      // knife: alice witnesses (0). goblet: carol, two switches away (2). relic: dave isolated (null).
      expect(aliceRow?.cells.map(cell => cell.cost)).toEqual([0, 2, null]);

      const bobRow = table.rows.find(row => row.characterId === 'bob');
      expect(bobRow?.cells.map(cell => cell.cost)).toEqual([1, 1, null]); // bob is one switch from both alice and carol.

      const daveRow = table.rows.find(row => row.characterId === 'dave');
      expect(daveRow?.cells.map(cell => cell.cost)).toEqual([null, null, 0]); // dave reaches only the relic he witnesses.
    });

    it('records the ordered switch chain (character + time) for each reachable item', () => {
      const table = buildTransferCostTable(CHARACTER_GRAPH, ITEM_GRAPH);
      const aliceRow = table.rows.find(row => row.characterId === 'alice');

      expect(aliceRow?.cells[0].switches).toEqual([]); // knife: already witnesses, no switch.
      expect(aliceRow?.cells[1].switches).toEqual([    // goblet: switch to bob at 100, then carol at 200.
        { characterId:'bob', characterTitle:'BOB', time:T_AB_EARLY },
        { characterId:'carol', characterTitle:'CAROL', time:T_BC }
      ]);
      expect(aliceRow?.cells[2].switches).toEqual([]); // relic: unreachable, no chain.

      const bobRow = table.rows.find(row => row.characterId === 'bob');
      expect(bobRow?.cells[0].switches).toEqual([{ characterId:'alice', characterTitle:'ALICE', time:T_AB_EARLY }]);
    });

    it('takes the lightest witness chain when an item has several', () => {
      const itemGraph:ItemGraph = { nodes:[_item('orb', ['carol', 'bob'])], characterColumns:[] };
      const table = buildTransferCostTable(CHARACTER_GRAPH, itemGraph);
      const aliceCell = table.rows.find(row => row.characterId === 'alice')?.cells[0];
      expect(aliceCell?.cost).toBe(1); // bob (1) beats carol (2).
      expect(aliceCell?.switches).toEqual([{ characterId:'bob', characterTitle:'BOB', time:T_AB_EARLY }]);
    });
  });
});

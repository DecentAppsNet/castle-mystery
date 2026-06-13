// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { buildTransferCostTable } from '../transferCostUtil';
import CharacterGraph, { CharacterGraphEdge, CharacterGraphNode } from '../types/CharacterGraph';
import ItemGraph, { ItemGraphNode } from '../types/ItemGraph';

function _node(id:string):CharacterGraphNode {
  return { id, title:id.toUpperCase(), isTitleKnown:true, isActiveStart:false };
}

function _edge(sourceId:string, targetId:string):CharacterGraphEdge {
  return { sourceId, targetId, directed:false, coPresences:[] };
}

// alice — bob — carol chain; dave is isolated.
const CHARACTER_GRAPH:CharacterGraph = {
  directed:false,
  nodes:[_node('alice'), _node('bob'), _node('carol'), _node('dave')],
  edges:[_edge('alice', 'bob'), _edge('bob', 'carol')]
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
    it('reports min transfers from each character to each item, null when unreachable', () => {
      const table = buildTransferCostTable(CHARACTER_GRAPH, ITEM_GRAPH);

      expect(table.items.map(item => item.id)).toEqual(['knife', 'goblet', 'relic']);
      const aliceRow = table.rows.find(row => row.characterId === 'alice');
      // knife: alice witnesses (0). goblet: carol, two switches away (2). relic: dave isolated (null).
      expect(aliceRow?.costs).toEqual([0, 2, null]);

      const bobRow = table.rows.find(row => row.characterId === 'bob');
      expect(bobRow?.costs).toEqual([1, 1, null]); // bob is one switch from both alice and carol.

      const daveRow = table.rows.find(row => row.characterId === 'dave');
      expect(daveRow?.costs).toEqual([null, null, 0]); // dave reaches only the relic he witnesses.
    });

    it('takes the nearest witness when an item has several', () => {
      const itemGraph:ItemGraph = { nodes:[_item('orb', ['carol', 'bob'])], characterColumns:[] };
      const table = buildTransferCostTable(CHARACTER_GRAPH, itemGraph);
      expect(table.rows.find(row => row.characterId === 'alice')?.costs).toEqual([1]); // bob (1) beats carol (2).
    });
  });
});

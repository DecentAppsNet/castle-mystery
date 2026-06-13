// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { itemGraphToJsonObject, renderItemGraphAscii } from '../itemGraphSerializeUtil';
import { evaluateItemReachability } from '../itemReachabilityUtil';
import ItemGraph from '../types/ItemGraph';

const GRAPH:ItemGraph = {
  nodes:[
    { id:'knife', title:'Knife', witnessCharacterIds:['alice'] },
    { id:'goblet', title:'Goblet', witnessCharacterIds:['carol'] }
  ],
  characterColumns:[
    { id:'alice', title:'Alice', isReachable:true },
    { id:'carol', title:'Carol', isReachable:false }
  ]
};

describe('itemGraphSerializeUtil', () => {
  describe('itemGraphToJsonObject()', () => {
    it('produces the stable automation contract shape', () => {
      const json = itemGraphToJsonObject(GRAPH, 'lvl.md', evaluateItemReachability(GRAPH));
      expect(json.level).toBe('lvl.md');
      expect(json.items).toEqual([
        { id:'knife', title:'Knife', witnessCharacterIds:['alice'] },
        { id:'goblet', title:'Goblet', witnessCharacterIds:['carol'] }
      ]);
      expect(json.characters).toEqual([
        { id:'alice', title:'Alice', isReachable:true },
        { id:'carol', title:'Carol', isReachable:false }
      ]);
      expect(json.reachability?.ok).toBe(false);
      expect(json.reachability?.unreachableItemIds).toEqual(['goblet']);
    });

    it('omits reachability when none is supplied', () => {
      expect(itemGraphToJsonObject(GRAPH).reachability).toBeNull();
    });
  });

  describe('renderItemGraphAscii()', () => {
    it('renders the legend, witness matrix, and result with markers', () => {
      const ascii = renderItemGraphAscii(GRAPH, evaluateItemReachability(GRAPH), 'lvl.md');
      expect(ascii).toContain('Item reachability graph — lvl.md');
      expect(ascii).toContain('Items (2):');
      expect(ascii).toContain('Witnessed by');
      expect(ascii).toMatch(/\[0\]/);
      expect(ascii).toContain('X');
      expect(ascii).toContain('!'); // goblet is unreachable
      expect(ascii).toContain('unreachable: ! [1] Goblet');
      expect(ascii).toContain('RESULT: FAIL');
    });

    it('passes and renders no matrix when the level has no placed items', () => {
      const emptyGraph:ItemGraph = { nodes:[], characterColumns:GRAPH.characterColumns };
      const ascii = renderItemGraphAscii(emptyGraph, evaluateItemReachability(emptyGraph));
      expect(ascii).toContain('Items (0):');
      expect(ascii).not.toContain('Witnessed by');
      expect(ascii).toContain('RESULT: PASS');
    });
  });
});

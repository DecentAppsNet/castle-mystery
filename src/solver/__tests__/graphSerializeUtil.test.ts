// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { characterGraphToJsonObject, renderCharacterGraphAscii } from '../graphSerializeUtil';
import { evaluateReachability } from '../reachabilityUtil';
import CharacterGraph, { CharacterGraphEdge, CharacterGraphNode } from '../types/CharacterGraph';

function _node(id:string, isActiveStart = false):CharacterGraphNode {
  return { id, title:id.toUpperCase(), isTitleKnown:true, isActiveStart };
}

function _edge(sourceId:string, targetId:string):CharacterGraphEdge {
  return { sourceId, targetId, directed:false, coPresences:[{ time:0, roomId:'hall' }] };
}

const GRAPH:CharacterGraph = {
  directed:false,
  nodes:[_node('a', true), _node('b'), _node('c')],
  edges:[_edge('a', 'b')]
};

describe('graphSerializeUtil', () => {
  describe('characterGraphToJsonObject()', () => {
    it('produces the stable automation contract shape', () => {
      const json = characterGraphToJsonObject(GRAPH, 'lvl.md', evaluateReachability(GRAPH, 'a'));
      expect(json.level).toBe('lvl.md');
      expect(json.directed).toBe(false);
      expect(json.nodes).toHaveLength(3);
      expect(json.edges).toEqual([{ source:'a', target:'b', directed:false, coPresences:[{ time:0, roomId:'hall' }] }]);
      expect(json.reachability?.ok).toBe(false);
      expect(json.reachability?.unreachableIds).toEqual(['c']);
    });

    it('omits reachability when none is supplied', () => {
      expect(characterGraphToJsonObject(GRAPH).reachability).toBeNull();
    });
  });

  describe('renderCharacterGraphAscii()', () => {
    it('renders the legend, adjacency matrix, and result with markers', () => {
      const ascii = renderCharacterGraphAscii(GRAPH, evaluateReachability(GRAPH, 'a'), 'lvl.md');
      expect(ascii).toContain('Character co-presence graph — lvl.md');
      expect(ascii).toContain('Nodes (3):');
      expect(ascii).toContain('Adjacency (X = shared a room):');
      expect(ascii).toMatch(/\[0\]/);
      expect(ascii).toContain('X');
      expect(ascii).toContain('!'); // c is unreachable
      expect(ascii).toContain('RESULT: FAIL');
    });

    it('reports a failure when the start character is missing', () => {
      const ascii = renderCharacterGraphAscii(GRAPH, evaluateReachability(GRAPH, 'missing'));
      expect(ascii).toContain("start character 'missing' not found");
      expect(ascii).toContain('RESULT: FAIL');
    });
  });
});

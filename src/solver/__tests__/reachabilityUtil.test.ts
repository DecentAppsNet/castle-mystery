// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { evaluateReachability, findReachableCharacterIds, findTransferDistances } from '../reachabilityUtil';
import CharacterGraph, { CharacterGraphEdge, CharacterGraphNode } from '../types/CharacterGraph';

function _node(id:string, isActiveStart = false):CharacterGraphNode {
  return { id, title:id, isTitleKnown:true, isActiveStart };
}

function _edge(sourceId:string, targetId:string, directed = false):CharacterGraphEdge {
  return { sourceId, targetId, directed, coPresences:[] };
}

function _graph(nodes:CharacterGraphNode[], edges:CharacterGraphEdge[], directed = false):CharacterGraph {
  return { directed, nodes, edges };
}

describe('reachabilityUtil', () => {
  describe('findReachableCharacterIds()', () => {
    it('walks undirected edges transitively from the start', () => {
      const graph = _graph([_node('a'), _node('b'), _node('c')], [_edge('a', 'b'), _edge('b', 'c')]);
      expect([...findReachableCharacterIds(graph, 'a')].sort()).toEqual(['a', 'b', 'c']);
    });

    it('respects edge direction for directed edges', () => {
      const graph = _graph([_node('a'), _node('b')], [_edge('a', 'b', true)], true);
      expect([...findReachableCharacterIds(graph, 'b')]).toEqual(['b']);
      expect([...findReachableCharacterIds(graph, 'a')].sort()).toEqual(['a', 'b']);
    });
  });

  describe('findTransferDistances()', () => {
    it('counts edges walked (switches) from the start, start = 0', () => {
      const graph = _graph([_node('a'), _node('b'), _node('c')], [_edge('a', 'b'), _edge('b', 'c')]);
      expect(findTransferDistances(graph, 'a')).toEqual(new Map([['a', 0], ['b', 1], ['c', 2]]));
    });

    it('omits characters with no path from the start', () => {
      const graph = _graph([_node('a'), _node('b'), _node('c')], [_edge('a', 'b')]);
      const distances = findTransferDistances(graph, 'a');
      expect(distances.get('c')).toBeUndefined();
      expect([...distances.keys()].sort()).toEqual(['a', 'b']);
    });

    it('takes the shortest distance when multiple paths exist', () => {
      // a-b, a-c, c-d, b-d: d is 2 hops via either branch.
      const graph = _graph([_node('a'), _node('b'), _node('c'), _node('d')],
        [_edge('a', 'b'), _edge('a', 'c'), _edge('c', 'd'), _edge('b', 'd')]);
      expect(findTransferDistances(graph, 'a').get('d')).toBe(2);
    });

    it('returns an empty map when the start id is missing', () => {
      expect(findTransferDistances(_graph([_node('a')], []), 'z').size).toBe(0);
    });
  });

  describe('evaluateReachability()', () => {
    it('reports ok when every character is reachable from the start', () => {
      const graph = _graph([_node('a', true), _node('b'), _node('c')], [_edge('a', 'b'), _edge('b', 'c')]);
      expect(evaluateReachability(graph, 'a')).toEqual({
        startId:'a', startExists:true, reachableIds:['a', 'b', 'c'], unreachableIds:[], ok:true
      });
    });

    it('lists unreachable characters when the graph is disconnected', () => {
      const graph = _graph([_node('a', true), _node('b'), _node('c')], [_edge('a', 'b')]);
      expect(evaluateReachability(graph, 'a')).toEqual({
        startId:'a', startExists:true, reachableIds:['a', 'b'], unreachableIds:['c'], ok:false
      });
    });

    it('is not ok when the start id is missing from the graph', () => {
      const graph = _graph([_node('a'), _node('b')], []);
      expect(evaluateReachability(graph, 'z')).toEqual({
        startId:'z', startExists:false, reachableIds:[], unreachableIds:['a', 'b'], ok:false
      });
    });
  });
});

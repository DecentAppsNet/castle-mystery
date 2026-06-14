// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { evaluateItemReachability } from '../itemReachabilityUtil';
import ItemGraph, { ItemGraphCharacterColumn, ItemGraphNode } from '../types/ItemGraph';

function _column(id:string, isReachable:boolean):ItemGraphCharacterColumn {
  return { id, title:id.toUpperCase(), isReachable };
}

function _node(id:string, witnessCharacterIds:string[]):ItemGraphNode {
  return { id, title:id.toUpperCase(), witnessCharacterIds };
}

function _graph(nodes:ItemGraphNode[], characterColumns:ItemGraphCharacterColumn[]):ItemGraph {
  return { nodes, characterColumns };
}

describe('itemReachabilityUtil', () => {
  describe('evaluateItemReachability()', () => {
    it('reports an item reachable when a reachable character witnesses it', () => {
      const graph = _graph([_node('knife', ['alice'])], [_column('alice', true)]);
      expect(evaluateItemReachability(graph)).toEqual({
        reachableItemIds:['knife'], unreachableItemIds:[], ok:true
      });
    });

    it('flags an item witnessed only by unreachable characters', () => {
      const graph = _graph(
        [_node('knife', ['alice']), _node('goblet', ['carol'])],
        [_column('alice', true), _column('carol', false)]
      );
      expect(evaluateItemReachability(graph)).toEqual({
        reachableItemIds:['knife'], unreachableItemIds:['goblet'], ok:false
      });
    });

    it('flags an item with no witnesses at all', () => {
      const graph = _graph([_node('orphan', [])], [_column('alice', true)]);
      expect(evaluateItemReachability(graph)).toEqual({
        reachableItemIds:[], unreachableItemIds:['orphan'], ok:false
      });
    });

    it('passes vacuously when there are no items', () => {
      expect(evaluateItemReachability(_graph([], [_column('alice', true)]))).toEqual({
        reachableItemIds:[], unreachableItemIds:[], ok:true
      });
    });

    it('treats an item reachable when any one of several witnesses is reachable', () => {
      const graph = _graph(
        [_node('relic', ['carol', 'bob'])],
        [_column('alice', true), _column('bob', true), _column('carol', false)]
      );
      expect(evaluateItemReachability(graph).ok).toBe(true);
    });
  });
});

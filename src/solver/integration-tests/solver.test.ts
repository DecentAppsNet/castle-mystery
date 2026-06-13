// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { characterGraphToJsonObject } from '../graphSerializeUtil';
import { solveLevel } from '../solverUtil';
import levelText from './fixtures/co-presence-level.md?raw';
import itemLevelText from './fixtures/item-reachability-level.md?raw';

describe('solver integration', () => {
  it('builds a graph and reachability from a fully loaded level', () => {
    setSeed(0);
    const level = loadLevelFromText(levelText);

    const result = solveLevel(level, 'co-presence-level.md');

    expect(result.graph.directed).toBe(false);
    expect(result.graph.nodes.map(node => node.id).sort()).toEqual(['alice', 'bob', 'carol']);

    // Alice and Bob share the Parlor (-> edge); Carol is alone in the Cellar (-> isolated).
    expect(result.graph.edges).toHaveLength(1);
    const edge = result.graph.edges[0];
    expect([edge.sourceId, edge.targetId]).toEqual(['alice', 'bob']);
    expect(edge.coPresences).toHaveLength(1);
    expect(edge.coPresences[0].time).toBe(level.startTime);
    expect(typeof edge.coPresences[0].roomId).toBe('string');

    expect(result.reachability.startId).toBe('alice');
    expect(result.reachability.ok).toBe(false);
    expect(result.reachability.unreachableIds).toEqual(['carol']);
    expect(result.asciiArt).toContain('RESULT: FAIL');

    expect(characterGraphToJsonObject(result.graph, result.levelName, result.reachability).nodes).toHaveLength(3);
  });

  it('flags an item only an unreachable character is co-present with', () => {
    setSeed(0);
    const level = loadLevelFromText(itemLevelText);

    const result = solveLevel(level, 'item-reachability-level.md');

    // Placed items only (the shared items.md definitions are excluded), one node per item.
    expect(result.itemGraph.nodes.map(node => node.id)).toEqual(['candle', 'goblet', 'knife', 'locket']);

    // Knife/Locket sit in the Parlor with reachable Alice & Bob; Candle is held by reachable Bob.
    // The Goblet is in the Cellar, where only unreachable Carol ever stands -> unreachable.
    expect(result.itemReachability.unreachableItemIds).toEqual(['goblet']);
    expect(result.itemReachability.reachableItemIds).toEqual(['candle', 'knife', 'locket']);
    expect(result.itemReachability.ok).toBe(false);

    // Carol is also an unreachable character, so the level fails overall on both checks.
    expect(result.reachability.unreachableIds).toEqual(['carol']);
    expect(result.ok).toBe(false);

    const goblet = result.itemGraph.nodes.find(node => node.id === 'goblet');
    expect(goblet?.witnessCharacterIds).toEqual(['carol']);
    const candle = result.itemGraph.nodes.find(node => node.id === 'candle');
    expect(candle?.witnessCharacterIds).toEqual(['alice', 'bob']);

    expect(result.asciiArt).toContain('Item reachability graph — item-reachability-level.md');

    // The room-layer cube re-bins the same co-presence by room. Item indices are id-sorted
    // (candle=0, goblet=1, knife=2, locket=3); character indices follow the character graph (alice=0,
    // bob=1, carol=2). The Parlor holds Alice & Bob with the Knife, Locket, and Bob's Candle; the
    // Cellar holds only Carol with the Goblet.
    const parlor = result.roomLayers.rooms.find(room => room.roomId === 'parlor');
    expect(parlor?.characterIndices).toEqual([0, 1]);
    expect(parlor?.itemIndices).toEqual([0, 2, 3]);
    const cellar = result.roomLayers.rooms.find(room => room.roomId === 'cellar');
    expect(cellar?.characterIndices).toEqual([2]);
    expect(cellar?.itemIndices).toEqual([1]);
    expect(cellar?.interactions).toHaveLength(1);
    expect(cellar?.interactions[0]).toMatchObject({ characterIndex:2, itemIndex:1 });
    expect(typeof cellar?.interactions[0].firstInteractionTime).toBe('number');
    expect(result.asciiArt).toContain('Room interaction cube — item-reachability-level.md');

    // Transfer-cost complexity: from the active Alice, the knife (she witnesses it) costs 0 switches,
    // while the Goblet — witnessed only by the unreachable Carol — is null. The cost table prints in
    // the always-inline analysis section, before the cube.
    const items = result.transferCostTable.items;
    const aliceRow = result.transferCostTable.rows.find(row => row.characterId === 'alice');
    expect(aliceRow?.cells[items.findIndex(item => item.id === 'knife')].cost).toBe(0);
    expect(aliceRow?.cells[items.findIndex(item => item.id === 'goblet')].cost).toBeNull();
    expect(result.analysisAscii).toContain('Item access cost — item-reachability-level.md');
    expect(result.analysisAscii).toContain('Item reachability graph — item-reachability-level.md');
  });
});

// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { characterGraphToJsonObject } from '../graphSerializeUtil';
import { solveLevel } from '../solverUtil';
import levelText from './fixtures/co-presence-level.md?raw';

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
});

/* This module answers the Phase 1 validation question: starting from the player's active
  character, can the player reach every other character by repeatedly switching to an actor who
  shares the current actor's room? That is graph reachability from the start node.

  Edges are walked according to their `directed` flag, so this already supports the future
  hidden-actor directed edges (see docs/adr-solver.md): an undirected edge connects both ways, a
  directed edge only source -> target. Phase 1 graphs are entirely undirected. */

import CharacterGraph from "./types/CharacterGraph";
import ReachabilityResult from "./types/ReachabilityResult";

function _createAdjacencyMap(graph:CharacterGraph):Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  graph.nodes.forEach(node => adjacency.set(node.id, []));
  graph.edges.forEach(edge => {
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    if (!edge.directed) adjacency.get(edge.targetId)?.push(edge.sourceId);
  });
  return adjacency;
}

export function findReachableCharacterIds(graph:CharacterGraph, startId:string):Set<string> {
  const reachable = new Set<string>();
  const adjacency = _createAdjacencyMap(graph);
  if (!adjacency.has(startId)) return reachable;

  const queue = [startId];
  reachable.add(startId);
  while (queue.length) {
    const currentId = queue.shift() as string;
    (adjacency.get(currentId) ?? []).forEach(neighborId => {
      if (reachable.has(neighborId)) return;
      reachable.add(neighborId);
      queue.push(neighborId);
    });
  }
  return reachable;
}

export function evaluateReachability(graph:CharacterGraph, startId:string):ReachabilityResult {
  const allIds = graph.nodes.map(node => node.id);
  const startExists = allIds.includes(startId);
  const reachable = startExists ? findReachableCharacterIds(graph, startId) : new Set<string>();
  const reachableIds = allIds.filter(id => reachable.has(id));
  const unreachableIds = allIds.filter(id => !reachable.has(id));
  return { startId, startExists, reachableIds, unreachableIds, ok:startExists && unreachableIds.length === 0 };
}

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

/* Breadth-first shortest-path distances from startId, measured in edges walked — i.e. the number of
  character switches the player makes to reach each character (the start character is 0). Characters
  with no path from the start are simply absent from the map. Edge direction is honored, so this is
  ready for the future hidden-actor directed edges. */
export function findTransferDistances(graph:CharacterGraph, startId:string):Map<string, number> {
  const distances = new Map<string, number>();
  const adjacency = _createAdjacencyMap(graph);
  if (!adjacency.has(startId)) return distances;

  distances.set(startId, 0);
  const queue = [startId];
  while (queue.length) {
    const currentId = queue.shift() as string;
    const neighborDistance = (distances.get(currentId) as number) + 1;
    (adjacency.get(currentId) ?? []).forEach(neighborId => {
      if (distances.has(neighborId)) return;
      distances.set(neighborId, neighborDistance);
      queue.push(neighborId);
    });
  }
  return distances;
}

export function findReachableCharacterIds(graph:CharacterGraph, startId:string):Set<string> {
  return new Set(findTransferDistances(graph, startId).keys());
}

export function evaluateReachability(graph:CharacterGraph, startId:string):ReachabilityResult {
  const allIds = graph.nodes.map(node => node.id);
  const startExists = allIds.includes(startId);
  const reachable = startExists ? findReachableCharacterIds(graph, startId) : new Set<string>();
  const reachableIds = allIds.filter(id => reachable.has(id));
  const unreachableIds = allIds.filter(id => !reachable.has(id));
  return { startId, startExists, reachableIds, unreachableIds, ok:startExists && unreachableIds.length === 0 };
}

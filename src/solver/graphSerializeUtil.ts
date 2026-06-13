/* This module serializes a CharacterGraph two ways (see docs/adr-solver.md):
  - characterGraphToJsonObject(): the stable machine contract a future level validator consumes.
  - renderCharacterGraphAscii(): a deterministic, human-readable rendering that the solver always
    produces, so it is shown whether the graph is generated from the CLI or programmatically. */

import CharacterGraph from "./types/CharacterGraph";
import ReachabilityResult from "./types/ReachabilityResult";

type CharacterGraphJson = {
  level:string|null,
  directed:boolean,
  nodes:Array<{ id:string, title:string, isTitleKnown:boolean, isActiveStart:boolean }>,
  edges:Array<{ source:string, target:string, directed:boolean, coPresences:Array<{ time:number, roomId:string }> }>,
  reachability:{ startId:string, startExists:boolean, reachableIds:string[], unreachableIds:string[], ok:boolean }|null
};

export function characterGraphToJsonObject(graph:CharacterGraph, levelName:string|null = null, reachability:ReachabilityResult|null = null):CharacterGraphJson {
  return {
    level:levelName,
    directed:graph.directed,
    nodes:graph.nodes.map(node => ({ id:node.id, title:node.title, isTitleKnown:node.isTitleKnown, isActiveStart:node.isActiveStart })),
    edges:graph.edges.map(edge => ({
      source:edge.sourceId,
      target:edge.targetId,
      directed:edge.directed,
      coPresences:edge.coPresences.map(coPresence => ({ time:coPresence.time, roomId:coPresence.roomId }))
    })),
    reachability:reachability ? {
      startId:reachability.startId,
      startExists:reachability.startExists,
      reachableIds:reachability.reachableIds,
      unreachableIds:reachability.unreachableIds,
      ok:reachability.ok
    } : null
  };
}

function _createNodeMarker(node:CharacterGraph['nodes'][number], unreachableIds:Set<string>):string {
  if (node.isActiveStart) return '*';
  if (unreachableIds.has(node.id)) return '!';
  return ' ';
}

function _renderNodeLegend(graph:CharacterGraph, unreachableIds:Set<string>):string[] {
  const indexWidth = String(Math.max(graph.nodes.length - 1, 0)).length;
  const lines = [`Nodes (${graph.nodes.length}):  * = player start   ! = unreachable`];
  graph.nodes.forEach((node, index) => {
    const indexLabel = `[${String(index).padStart(indexWidth)}]`;
    lines.push(`  ${indexLabel} ${_createNodeMarker(node, unreachableIds)} ${node.title}`);
  });
  return lines;
}

function _createAdjacencySet(graph:CharacterGraph):Set<string> {
  const indexById = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const adjacency = new Set<string>();
  graph.edges.forEach(edge => {
    const sourceIndex = indexById.get(edge.sourceId), targetIndex = indexById.get(edge.targetId);
    if (sourceIndex === undefined || targetIndex === undefined) return;
    adjacency.add(`${sourceIndex} ${targetIndex}`);
    adjacency.add(`${targetIndex} ${sourceIndex}`);
  });
  return adjacency;
}

function _renderAdjacencyMatrix(graph:CharacterGraph):string[] {
  const count = graph.nodes.length;
  const adjacency = _createAdjacencySet(graph);
  const cellWidth = Math.max(String(Math.max(count - 1, 0)).length, 1);
  const gutter = ' '.repeat(cellWidth + 3); // Width of a "[i]" row label.

  const headerCells = graph.nodes.map((_node, index) => String(index).padStart(cellWidth));
  const lines = ['Adjacency (X = shared a room):', `${gutter}${headerCells.join(' ')}`];
  graph.nodes.forEach((_node, rowIndex) => {
    const rowLabel = `[${String(rowIndex).padStart(cellWidth)}]`;
    const cells = graph.nodes.map((_other, columnIndex) => {
      const symbol = rowIndex === columnIndex ? '\\' : (adjacency.has(`${rowIndex} ${columnIndex}`) ? 'X' : '.');
      return symbol.padStart(cellWidth);
    });
    lines.push(`${rowLabel} ${cells.join(' ')}`);
  });
  return lines;
}

function _findNodeLabel(graph:CharacterGraph, id:string):string {
  const index = graph.nodes.findIndex(node => node.id === id);
  if (index === -1) return id;
  return `[${index}] ${graph.nodes[index].title}`;
}

function _renderReachabilitySummary(graph:CharacterGraph, reachability:ReachabilityResult):string[] {
  if (!reachability.startExists) {
    return [`Reachability: start character '${reachability.startId}' not found in graph.`, 'RESULT: FAIL'];
  }
  const reachableCount = reachability.reachableIds.length;
  const lines = [`Reachability from * ${_findNodeLabel(graph, reachability.startId)}: ${reachableCount}/${graph.nodes.length} reachable`];
  if (reachability.unreachableIds.length) {
    lines.push(`  unreachable: ${reachability.unreachableIds.map(id => `! ${_findNodeLabel(graph, id)}`).join(', ')}`);
  }
  lines.push(`RESULT: ${reachability.ok ? 'PASS' : 'FAIL'}`);
  return lines;
}

export function renderCharacterGraphAscii(graph:CharacterGraph, reachability:ReachabilityResult|null = null, levelName:string|null = null):string {
  const unreachableIds = new Set(reachability?.unreachableIds ?? []);
  const header = `Character co-presence graph${levelName ? ` — ${levelName}` : ''}  (${graph.directed ? 'directed' : 'undirected'})`;
  const sections = [
    [header],
    _renderNodeLegend(graph, unreachableIds),
    _renderAdjacencyMatrix(graph),
    reachability ? _renderReachabilitySummary(graph, reachability) : []
  ].filter(section => section.length);
  return sections.map(section => section.join('\n')).join('\n\n') + '\n';
}

/* This module serializes an ItemGraph two ways (see docs/adr-solver.md), mirroring
  graphSerializeUtil for characters:
  - itemGraphToJsonObject(): the stable machine contract a future level validator consumes.
  - renderItemGraphAscii(): a deterministic, human-readable rendering shown below the character
    co-presence graph. The witness matrix has one row per item and one column per character; a
    column index matches the same `[i]` index in the character legend rendered above it. */

import ItemGraph from "./types/ItemGraph";
import ItemReachabilityResult from "./types/ItemReachabilityResult";

type ItemGraphJson = {
  level:string|null,
  items:Array<{ id:string, title:string, witnessCharacterIds:string[] }>,
  characters:Array<{ id:string, title:string, isReachable:boolean }>,
  reachability:{ reachableItemIds:string[], unreachableItemIds:string[], ok:boolean }|null
};

export function itemGraphToJsonObject(graph:ItemGraph, levelName:string|null = null, reachability:ItemReachabilityResult|null = null):ItemGraphJson {
  return {
    level:levelName,
    items:graph.nodes.map(node => ({ id:node.id, title:node.title, witnessCharacterIds:[...node.witnessCharacterIds] })),
    characters:graph.characterColumns.map(column => ({ id:column.id, title:column.title, isReachable:column.isReachable })),
    reachability:reachability ? {
      reachableItemIds:reachability.reachableItemIds,
      unreachableItemIds:reachability.unreachableItemIds,
      ok:reachability.ok
    } : null
  };
}

function _createItemMarker(node:ItemGraph['nodes'][number], unreachableIds:Set<string>):string {
  return unreachableIds.has(node.id) ? '!' : ' ';
}

function _renderItemLegend(graph:ItemGraph, unreachableIds:Set<string>):string[] {
  const indexWidth = String(Math.max(graph.nodes.length - 1, 0)).length;
  const lines = [`Items (${graph.nodes.length}):  ! = not reachable through a reachable character`];
  graph.nodes.forEach((node, index) => {
    const indexLabel = `[${String(index).padStart(indexWidth)}]`;
    lines.push(`  ${indexLabel} ${_createItemMarker(node, unreachableIds)} ${node.title}`);
  });
  return lines;
}

function _renderWitnessMatrix(graph:ItemGraph):string[] {
  const rowIndexWidth = String(Math.max(graph.nodes.length - 1, 0)).length;
  const columnWidth = Math.max(String(Math.max(graph.characterColumns.length - 1, 0)).length, 1);
  const gutter = ' '.repeat(rowIndexWidth + 3); // Width of a "[i]" row label plus its trailing space.

  const indexCells = graph.characterColumns.map((_column, index) => String(index).padStart(columnWidth));
  const reachableCells = graph.characterColumns.map(column => (column.isReachable ? '*' : '.').padStart(columnWidth));
  const lines = [
    'Witnessed by (X = shared a room with that character; columns are [i] characters above, * = reachable):',
    `${gutter}${indexCells.join(' ')}`,
    `${gutter}${reachableCells.join(' ')}`
  ];
  graph.nodes.forEach((node, rowIndex) => {
    const witnessIds = new Set(node.witnessCharacterIds);
    const rowLabel = `[${String(rowIndex).padStart(rowIndexWidth)}]`;
    const cells = graph.characterColumns.map(column => (witnessIds.has(column.id) ? 'X' : '.').padStart(columnWidth));
    lines.push(`${rowLabel} ${cells.join(' ')}`);
  });
  return lines;
}

function _findItemLabel(graph:ItemGraph, id:string):string {
  const index = graph.nodes.findIndex(node => node.id === id);
  if (index === -1) return id;
  return `[${index}] ${graph.nodes[index].title}`;
}

function _renderItemReachabilitySummary(graph:ItemGraph, reachability:ItemReachabilityResult):string[] {
  const reachableCount = reachability.reachableItemIds.length;
  const lines = [`Reachability: ${reachableCount}/${graph.nodes.length} item(s) reachable through characters`];
  if (reachability.unreachableItemIds.length) {
    lines.push(`  unreachable: ${reachability.unreachableItemIds.map(id => `! ${_findItemLabel(graph, id)}`).join(', ')}`);
  }
  lines.push(`RESULT: ${reachability.ok ? 'PASS' : 'FAIL'}`);
  return lines;
}

export function renderItemGraphAscii(graph:ItemGraph, reachability:ItemReachabilityResult|null = null, levelName:string|null = null):string {
  const unreachableIds = new Set(reachability?.unreachableItemIds ?? []);
  const header = `Item reachability graph${levelName ? ` — ${levelName}` : ''}  (items × characters)`;
  const sections = [
    [header],
    _renderItemLegend(graph, unreachableIds),
    graph.nodes.length ? _renderWitnessMatrix(graph) : [],
    reachability ? _renderItemReachabilitySummary(graph, reachability) : []
  ].filter(section => section.length);
  return sections.map(section => section.join('\n')).join('\n\n') + '\n';
}

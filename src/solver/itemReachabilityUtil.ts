/* This module answers the item half of the solver's playability check: given the characters the
  player can reach (the character co-presence reachability), can the player reach every placed item?
  An item is reachable when at least one character that is itself reachable is co-present with it at
  some point on the timeline (recorded as the item's witnesses). There is no item-to-item
  propagation — the player reaches items only through characters. See docs/adr-solver.md. */

import ItemGraph from "./types/ItemGraph";
import ItemReachabilityResult from "./types/ItemReachabilityResult";

export function evaluateItemReachability(graph:ItemGraph):ItemReachabilityResult {
  const reachableCharacterIds = new Set(graph.characterColumns.filter(column => column.isReachable).map(column => column.id));
  const reachableItemIds:string[] = [];
  const unreachableItemIds:string[] = [];
  graph.nodes.forEach(node => {
    const isReachable = node.witnessCharacterIds.some(characterId => reachableCharacterIds.has(characterId));
    (isReachable ? reachableItemIds : unreachableItemIds).push(node.id);
  });
  return { reachableItemIds, unreachableItemIds, ok:unreachableItemIds.length === 0 };
}

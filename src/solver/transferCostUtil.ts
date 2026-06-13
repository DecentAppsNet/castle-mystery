/* Builds the level-complexity table (see docs/adr-solver.md): the minimum number of character
  transfers each character needs to reach each placed item, combining the two backing graphs.

  An item is "reached" once the player controls a character co-present with it (one of the item's
  witnesses). Starting from a character, BFS over the character co-presence graph gives the number of
  switches to reach every other character (findTransferDistances); the cost to an item is then the
  smallest of those distances over the item's witnesses, or null when no witness is reachable. */

import { findTransferDistances } from "./reachabilityUtil";
import CharacterGraph from "./types/CharacterGraph";
import ItemGraph from "./types/ItemGraph";
import TransferCostTable, { TransferCostRow } from "./types/TransferCostTable";

function _minWitnessDistance(witnessCharacterIds:string[], distanceByCharacterId:Map<string, number>):number|null {
  let best:number|null = null;
  witnessCharacterIds.forEach(witnessId => {
    const distance = distanceByCharacterId.get(witnessId);
    if (distance === undefined) return; // Witness not reachable from this character.
    if (best === null || distance < best) best = distance;
  });
  return best;
}

export function buildTransferCostTable(characterGraph:CharacterGraph, itemGraph:ItemGraph):TransferCostTable {
  const items = itemGraph.nodes.map(node => ({ id:node.id, title:node.title }));
  const rows:TransferCostRow[] = characterGraph.nodes.map(characterNode => {
    const distanceByCharacterId = findTransferDistances(characterGraph, characterNode.id);
    const costs = itemGraph.nodes.map(itemNode => _minWitnessDistance(itemNode.witnessCharacterIds, distanceByCharacterId));
    return { characterId:characterNode.id, characterTitle:characterNode.title, costs };
  });
  return { items, rows };
}

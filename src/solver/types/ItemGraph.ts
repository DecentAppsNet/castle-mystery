/* Graph model for the level solver's item-reachability check (see docs/adr-solver.md). Each item
  that is actually placed in the level (in a room or held by a character) is a node. An item is
  "witnessed by" a character when the two share a room at the same time during the level — i.e. the
  player, having switched to that character, would be co-present with the item and could discover it.

  `characterColumns` mirrors the character co-presence graph's node order, so an item-graph column
  index lines up with the same `[i]` index in the character legend, and each column records whether
  that character is itself reachable from the player's start. An item is reachable when at least one
  of its witnesses is a reachable character (see itemReachabilityUtil). */

type ItemGraphNode = Readonly<{
  id:string,
  title:string,
  witnessCharacterIds:string[] // Sorted, unique ids of characters co-present with the item at some sample time.
}>

type ItemGraphCharacterColumn = Readonly<{
  id:string,
  title:string,
  isReachable:boolean
}>

type ItemGraph = Readonly<{
  nodes:ItemGraphNode[],
  characterColumns:ItemGraphCharacterColumn[]
}>

export type { ItemGraphNode, ItemGraphCharacterColumn };
export default ItemGraph;

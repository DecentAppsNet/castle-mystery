/* Level-complexity table (see docs/adr-solver.md): for each character (row) and each placed item
  (column), the minimum number of character transfers ("switches") the player must make, starting
  from that character, to reach a character that is co-present with the item. 0 means the character
  already witnesses the item; null means no chain of switches reaches any witness (the item is
  unreachable from that character).

  This is the first complexity metric derived from the two backing graphs — the character co-presence
  graph (which switches are possible) and the item graph (which characters witness each item). A later
  phase will fold in timing and the specific switch sequence; rows reuse the character graph's node
  order and columns the item graph's node order so that extension lines up. */

type TransferCostRow = Readonly<{
  characterId:string,
  characterTitle:string,
  costs:(number|null)[] // Indexed by item column; min character transfers, or null when unreachable.
}>

type TransferCostTable = Readonly<{
  items:ReadonlyArray<Readonly<{ id:string, title:string }>>, // Columns, in item-graph node order.
  rows:TransferCostRow[]                                       // One per character, in character-graph node order.
}>

export type { TransferCostRow };
export default TransferCostTable;

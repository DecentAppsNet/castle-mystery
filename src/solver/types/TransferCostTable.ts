/* Level-complexity table (see docs/adr-solver.md): for each character (row) and each placed item
  (column), the time-respecting chain of character switches the player must make, starting from that
  character, to reach a character co-present with the item.

  A switch is "become a character you currently share a room with"; a chain is valid only when its
  switch times are non-decreasing — the player rides each character forward in time, so cannot switch
  at a moment earlier than the current one. A cell's `cost` is the fewest switches over all such chains
  to any of the item's witnesses: 0 means the start character already witnesses the item (no switch);
  null means no time-respecting chain reaches a witness (unreachable, shown as ∞). `switches` is the
  chosen chain, each step naming the character switched to and the co-presence time of the switch.

  This is the first complexity metric derived from the two backing graphs — the character co-presence
  graph (which switches are possible, and when) and the item graph (which characters witness each
  item). Rows reuse the character graph's node order and columns the item graph's node order. */

type TransferSwitch = Readonly<{
  characterId:string,    // The character the player switches to at this step.
  characterTitle:string, // Its full title; serializers truncate it for display.
  time:number            // Msecs of the co-presence at which the switch happens (non-decreasing along a chain).
}>

type TransferCostCell = Readonly<{
  cost:number|null,          // Fewest time-respecting switches; 0 = already witnesses; null = unreachable.
  switches:TransferSwitch[]  // The chosen chain, in order; length === cost (empty when cost is 0 or null).
}>

type TransferCostRow = Readonly<{
  characterId:string,
  characterTitle:string,
  cells:TransferCostCell[] // One per item column, in item-graph node order.
}>

type TransferCostTable = Readonly<{
  items:ReadonlyArray<Readonly<{ id:string, title:string }>>, // Columns, in item-graph node order.
  rows:TransferCostRow[]                                       // One per character, in character-graph node order.
}>

export type { TransferSwitch, TransferCostCell, TransferCostRow };
export default TransferCostTable;

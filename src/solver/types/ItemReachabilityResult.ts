/* Result of the item half of the solver's playability check: which placed items can the player
  reach by following characters reachable from the start, and which cannot. An item is reachable
  when a reachable character is co-present with it at some point on the timeline. See
  docs/adr-solver.md. */

type ItemReachabilityResult = Readonly<{
  reachableItemIds:string[],
  unreachableItemIds:string[],
  ok:boolean
}>

export default ItemReachabilityResult;

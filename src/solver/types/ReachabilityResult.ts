/* Result of evaluating whether every character is reachable from the player's starting actor by
  walking the (currently undirected) co-presence graph. See docs/adr-solver.md. */

type ReachabilityResult = Readonly<{
  startId:string,
  startExists:boolean,
  reachableIds:string[],
  unreachableIds:string[],
  ok:boolean
}>

export default ReachabilityResult;

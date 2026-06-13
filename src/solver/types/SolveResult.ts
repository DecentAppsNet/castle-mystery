import CharacterGraph from "./CharacterGraph";
import ItemGraph from "./ItemGraph";
import ItemReachabilityResult from "./ItemReachabilityResult";
import ReachabilityResult from "./ReachabilityResult";

/* Everything the solver derives for one level. `asciiArt` is always populated (the character
  co-presence graph followed by the item-reachability graph) so any caller — the scripts/solve.ts
  CLI or a programmatic caller — can display both graphs without extra steps. `ok` is the combined
  verdict: the level passes only when every character and every placed item is reachable. */
type SolveResult = Readonly<{
  levelName:string|null,
  graph:CharacterGraph,
  reachability:ReachabilityResult,
  itemGraph:ItemGraph,
  itemReachability:ItemReachabilityResult,
  asciiArt:string,
  ok:boolean
}>

export default SolveResult;

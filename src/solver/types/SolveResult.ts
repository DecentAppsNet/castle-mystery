import CharacterGraph from "./CharacterGraph";
import ItemGraph from "./ItemGraph";
import ItemReachabilityResult from "./ItemReachabilityResult";
import ReachabilityResult from "./ReachabilityResult";
import RoomLayerView from "./RoomLayerView";

/* Everything the solver derives for one level. `asciiArt` is always populated (the character
  co-presence graph, the item-reachability graph, then the per-room interaction cube) so any
  caller — the scripts/solve.ts CLI or a programmatic caller — can display them all without extra
  steps. `ok` is the combined verdict: the level passes only when every character and every placed
  item is reachable (the `roomLayers` cube is a visualization and does not affect `ok`). */
type SolveResult = Readonly<{
  levelName:string|null,
  graph:CharacterGraph,
  reachability:ReachabilityResult,
  itemGraph:ItemGraph,
  itemReachability:ItemReachabilityResult,
  roomLayers:RoomLayerView,
  asciiArt:string,
  ok:boolean
}>

export default SolveResult;

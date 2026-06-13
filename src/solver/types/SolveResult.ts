import CharacterGraph from "./CharacterGraph";
import ItemGraph from "./ItemGraph";
import ItemReachabilityResult from "./ItemReachabilityResult";
import ReachabilityResult from "./ReachabilityResult";
import RoomLayerView from "./RoomLayerView";

/* Everything the solver derives for one level. The ASCII renderings come in two parts so a caller can
  place them independently: `graphsAscii` is the character co-presence graph + item-reachability graph
  (which carry the reachability verdict), and `roomLayerAscii` is the per-room interaction cube (a wide
  diagnostic). `asciiArt` is their combined convenience render (`graphsAscii` then `roomLayerAscii`).
  `ok` is the combined verdict: the level passes only when every character and every placed item is
  reachable (the `roomLayers` cube is a visualization and does not affect `ok`). */
type SolveResult = Readonly<{
  levelName:string|null,
  graph:CharacterGraph,
  reachability:ReachabilityResult,
  itemGraph:ItemGraph,
  itemReachability:ItemReachabilityResult,
  roomLayers:RoomLayerView,
  graphsAscii:string,
  roomLayerAscii:string,
  asciiArt:string,
  ok:boolean
}>

export default SolveResult;

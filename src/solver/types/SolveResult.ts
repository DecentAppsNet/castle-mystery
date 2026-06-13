import CharacterGraph from "./CharacterGraph";
import ItemGraph from "./ItemGraph";
import ItemReachabilityResult from "./ItemReachabilityResult";
import ReachabilityResult from "./ReachabilityResult";
import RoomLayerView from "./RoomLayerView";
import TransferCostTable from "./TransferCostTable";

/* Everything the solver derives for one level. The ASCII renderings come in two parts so a caller can
  place them independently: `analysisAscii` is the always-shown analysis — the character co-presence
  graph + item-reachability graph (which carry the reachability verdict) followed by the
  item-access-cost table (`transferCostTable`, level complexity) — and `roomLayerAscii` is the wide
  per-room interaction cube (a "nice to have" diagnostic). `asciiArt` is their combined convenience
  render (`analysisAscii` then `roomLayerAscii`). `ok` is the combined verdict: the level passes only
  when every character and every placed item is reachable (the cube does not affect `ok`). */
type SolveResult = Readonly<{
  levelName:string|null,
  graph:CharacterGraph,
  reachability:ReachabilityResult,
  itemGraph:ItemGraph,
  itemReachability:ItemReachabilityResult,
  transferCostTable:TransferCostTable,
  roomLayers:RoomLayerView,
  analysisAscii:string,
  roomLayerAscii:string,
  asciiArt:string,
  ok:boolean
}>

export default SolveResult;

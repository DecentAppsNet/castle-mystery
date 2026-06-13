import CharacterGraph from "./CharacterGraph";
import ReachabilityResult from "./ReachabilityResult";

/* Everything the solver derives for one level. `asciiArt` is always populated so any caller — the
  scripts/solve.ts CLI or a programmatic caller — can display the graph without extra steps. */
type SolveResult = Readonly<{
  levelName:string|null,
  graph:CharacterGraph,
  reachability:ReachabilityResult,
  asciiArt:string
}>

export default SolveResult;

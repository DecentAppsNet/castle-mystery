/* The machine-readable "fitness" of one level: the structural gate booleans (is it reachable?) and the
  integer complexity aggregates the generative level designer optimizes against. Built from a
  SolveResult by buildLevelFitness() (see ../fitnessUtil.ts) and emitted as JSON by
  scripts/evaluateLevel.ts. This is the structural-oracle contract the multi-agent generator consumes —
  see docs/design/world-gen-generative-level-design.md. The semantic oracle (/world-test) contributes a
  separate per-character signal that is merged in by a later phase. */

type FitnessGates = Readonly<{
  charactersReachable:boolean, // Every character reachable from the active character (reachability.ok).
  itemsReachable:boolean,      // Every placed item witnessed by a reachable character (itemReachability.ok).
  noAnachronisms:boolean,      // No character is scheduled to do two things at once (see TimelineAnachronism).
  ok:boolean                   // All of the above (SolveResult.ok). The structural pass/fail verdict.
}>

type AnachronismDetail = Readonly<{
  characterId:string,
  characterTitle:string,
  occupyingType:string,
  occupyingStartTime:number,
  occupyingEndTime:number,
  conflictingType:string,
  conflictingStartTime:number,
  conflictingEndTime:number,
  overlapMsecs:number
}>

type ComplexityMetrics = Readonly<{
  totalPairCount:number,         // characters × items — every cell of the transfer-cost table.
  reachablePairCount:number,     // pairs with a finite switch cost.
  unreachablePairCount:number,   // pairs with no time-respecting chain (cost ∞).
  maxCost:number|null,           // largest finite switch cost; null when no pair is reachable.
  meanCost:number|null,          // mean finite switch cost (2 dp); null when no pair is reachable.
  costHistogram:Readonly<Record<string, number>> // finite cost value -> number of pairs at that cost.
}>

type LevelFitness = Readonly<{
  levelName:string|null,
  gates:FitnessGates,
  counts:Readonly<{ characters:number, items:number }>,
  unreachable:Readonly<{ characterIds:string[], itemIds:string[] }>,
  anachronisms:AnachronismDetail[],
  complexity:ComplexityMetrics
}>

export type { FitnessGates, AnachronismDetail, ComplexityMetrics };
export default LevelFitness;

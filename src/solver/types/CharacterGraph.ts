/* Graph model for the level solver: characters are nodes and an edge means two characters shared a
  room at the same time during the level (an "encounter"). See docs/adr-solver.md.

  The model is future-proofed for directed edges (hidden actors who can see others in a room but
  not vice-versa): every edge carries a `directed` flag. Phase 1 only produces undirected edges
  (`directed:false`), stored once per unordered pair with `sourceId` < `targetId`. */

type CharacterGraphNode = Readonly<{
  id:string,
  title:string,
  isTitleKnown:boolean,
  isActiveStart:boolean
}>

type CharacterCoPresence = Readonly<{
  time:number,
  roomId:string
}>

type CharacterGraphEdge = Readonly<{
  sourceId:string,
  targetId:string,
  directed:boolean,
  coPresences:CharacterCoPresence[]
}>

type CharacterGraph = Readonly<{
  directed:boolean,
  nodes:CharacterGraphNode[],
  edges:CharacterGraphEdge[]
}>

export type { CharacterGraphNode, CharacterCoPresence, CharacterGraphEdge };
export default CharacterGraph;

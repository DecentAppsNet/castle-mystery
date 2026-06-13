/* Builds the level-complexity table (see docs/adr-solver.md): the fewest time-respecting character
  switches each character needs to reach each placed item, plus the specific switch chain, combining
  the two backing graphs.

  A switch is possible only when two characters share a room (a co-presence edge), and a chain's switch
  times must be non-decreasing — the player rides each character forward in time and cannot switch at a
  moment before the current one. From a start character we run a time-aware shortest-path
  (`_findSwitchChains`): states are (character, current time), an edge advances time to the earliest
  co-presence not before now, and the first time a character is settled gives its fewest-switch chain.
  An item's cost is the lightest such chain over its witnesses (0 = the start character already
  witnesses it), or null when no time-respecting chain reaches any witness. */

import CharacterGraph from "./types/CharacterGraph";
import ItemGraph from "./types/ItemGraph";
import TransferCostTable, { TransferCostCell, TransferCostRow, TransferSwitch } from "./types/TransferCostTable";

type SwitchChain = Readonly<{ switchCount:number, switches:TransferSwitch[] }>;
type Neighbor = Readonly<{ neighborId:string, times:number[] }>; // times ascending.
type SearchState = Readonly<{ characterId:string, time:number, switchCount:number, switches:TransferSwitch[] }>;

// Adjacency with each neighbor's co-presence times (ascending), honoring the directed flag: an
// undirected edge connects both ways, a directed edge only source -> target.
function _buildTimedAdjacency(graph:CharacterGraph):Map<string, Neighbor[]> {
  const timesByNeighbor = new Map<string, Map<string, number[]>>();
  graph.nodes.forEach(node => timesByNeighbor.set(node.id, new Map()));
  const link = (fromId:string, toId:string, times:number[]) => {
    const neighbors = timesByNeighbor.get(fromId);
    if (!neighbors) return;
    neighbors.set(toId, (neighbors.get(toId) ?? []).concat(times));
  };
  graph.edges.forEach(edge => {
    const times = edge.coPresences.map(coPresence => coPresence.time);
    link(edge.sourceId, edge.targetId, times);
    if (!edge.directed) link(edge.targetId, edge.sourceId, times);
  });
  return new Map(Array.from(timesByNeighbor, ([id, neighbors]) =>
    [id, Array.from(neighbors, ([neighborId, times]) => ({ neighborId, times:[...times].sort((a, b) => a - b) }))]));
}

// Earliest co-presence time on an edge that is not before `notBefore`, or null when there is none.
function _earliestTimeNotBefore(times:number[], notBefore:number):number|null {
  for (const time of times) { if (time >= notBefore) return time; }
  return null;
}

// Order states by fewest switches, then earliest arrival, then id — so the first time any state of a
// character is settled it carries that character's fewest-switch (and, among those, earliest) chain.
function _isStateBefore(a:SearchState, b:SearchState):boolean {
  if (a.switchCount !== b.switchCount) return a.switchCount < b.switchCount;
  if (a.time !== b.time) return a.time < b.time;
  return a.characterId < b.characterId;
}

function _indexOfBestState(states:SearchState[]):number {
  let bestIndex = 0;
  for (let index = 1; index < states.length; ++index) {
    if (_isStateBefore(states[index], states[bestIndex])) bestIndex = index;
  }
  return bestIndex;
}

/* Time-aware shortest paths from startId: for every character reachable by a time-respecting switch
  chain, the fewest-switch chain to it (the start character itself at 0 switches). States are
  (character, arrival time) so a character can be revisited at an earlier time with more switches — a
  later switch may depend on that earlier arrival — but the first settle of a character fixes its
  answer. The graph is tiny (one node per character), so a linear-scan frontier is plenty. */
function _findSwitchChains(graph:CharacterGraph, startId:string):Map<string, SwitchChain> {
  const titleById = new Map(graph.nodes.map(node => [node.id, node.title]));
  const adjacency = _buildTimedAdjacency(graph);
  const chainByCharacter = new Map<string, SwitchChain>();
  if (!adjacency.has(startId)) return chainByCharacter;

  const settledStates = new Set<string>();
  const frontier:SearchState[] = [{ characterId:startId, time:-Infinity, switchCount:0, switches:[] }];
  while (frontier.length) {
    const state = frontier.splice(_indexOfBestState(frontier), 1)[0];
    const stateKey = `${state.characterId}|${state.time}`;
    if (settledStates.has(stateKey)) continue;
    settledStates.add(stateKey);
    if (!chainByCharacter.has(state.characterId)) chainByCharacter.set(state.characterId, { switchCount:state.switchCount, switches:state.switches });

    (adjacency.get(state.characterId) ?? []).forEach(neighbor => {
      const switchTime = _earliestTimeNotBefore(neighbor.times, state.time);
      if (switchTime === null || settledStates.has(`${neighbor.neighborId}|${switchTime}`)) return;
      const step:TransferSwitch = { characterId:neighbor.neighborId, characterTitle:titleById.get(neighbor.neighborId) ?? neighbor.neighborId, time:switchTime };
      frontier.push({ characterId:neighbor.neighborId, time:switchTime, switchCount:state.switchCount + 1, switches:[...state.switches, step] });
    });
  }
  return chainByCharacter;
}

// The final switch time of a chain (when the player arrives at the witness); -Infinity for the
// zero-switch case so an already-witnessing start always wins.
function _finalTime(chain:SwitchChain):number {
  return chain.switches.length ? chain.switches[chain.switches.length - 1].time : -Infinity;
}

// The lighter of two chains: fewer switches, then the earlier arrival. Witness ids are iterated in
// sorted order and ties keep the incumbent, so the choice is deterministic.
function _isLighterChain(candidate:SwitchChain, incumbent:SwitchChain):boolean {
  if (candidate.switchCount !== incumbent.switchCount) return candidate.switchCount < incumbent.switchCount;
  return _finalTime(candidate) < _finalTime(incumbent);
}

function _cellForItem(witnessCharacterIds:string[], chainByCharacter:Map<string, SwitchChain>):TransferCostCell {
  let best:SwitchChain|null = null;
  for (const witnessId of witnessCharacterIds) {
    const chain = chainByCharacter.get(witnessId);
    if (chain && (best === null || _isLighterChain(chain, best))) best = chain;
  }
  return best === null ? { cost:null, switches:[] } : { cost:best.switchCount, switches:best.switches };
}

export function buildTransferCostTable(characterGraph:CharacterGraph, itemGraph:ItemGraph):TransferCostTable {
  const items = itemGraph.nodes.map(node => ({ id:node.id, title:node.title }));
  const rows:TransferCostRow[] = characterGraph.nodes.map(characterNode => {
    const chainByCharacter = _findSwitchChains(characterGraph, characterNode.id);
    const cells = itemGraph.nodes.map(itemNode => _cellForItem(itemNode.witnessCharacterIds, chainByCharacter));
    return { characterId:characterNode.id, characterTitle:characterNode.title, cells };
  });
  return { items, rows };
}

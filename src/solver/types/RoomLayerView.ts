/* Model for the solver's room-interaction cube (see docs/adr-solver.md). The character co-presence
  graph and item-reachability graph each collapse the level to a single matrix; this view re-bins the
  same co-presence data by room so each room can be drawn as one layer of an isometric cube.

  Each RoomLayer is one room. Within a room, a character "interacts with" an item when the two shared
  that room at the same sampled time (the same co-presence relation the item-reachability graph uses,
  but kept per-room instead of aggregated). Indices are shared with the two graphs so the cube reads
  against their legends: `characterIndices`/`characterIndex` index into `characterLabels` (mirroring
  the character graph's node order), and `itemIndices`/`itemIndex` index into `itemLabels` (mirroring
  the item graph's node order). */

type RoomLayerInteraction = Readonly<{
  characterIndex:number,
  itemIndex:number,
  firstInteractionTime:number // Msecs of the earliest sampled time the character and item shared this room.
}>

type RoomLayer = Readonly<{
  roomId:string,
  title:string,
  gridRow:number,            // Position in the level-map-derived room grid (0 = topmost row of rooms).
  gridCol:number,            // Position in the level-map-derived room grid (0 = leftmost column of rooms).
  characterIndices:number[], // Ascending, of characters present in the room at some sampled time.
  itemIndices:number[],      // Ascending, of items present in the room at some sampled time.
  interactions:RoomLayerInteraction[] // Ascending by (characterIndex, itemIndex); co-present pairs in this room.
}>

type RoomLayerView = Readonly<{
  rooms:RoomLayer[], // In level (file) order; gridRow/gridCol place each as a 3D box matching the level map.
  characterLabels:string[],
  itemLabels:string[]
}>

export type { RoomLayer, RoomLayerInteraction };
export default RoomLayerView;

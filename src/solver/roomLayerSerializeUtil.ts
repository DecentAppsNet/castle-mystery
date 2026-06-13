/* This module serializes a RoomLayerView two ways (see docs/adr-solver.md), mirroring the other two
  serializers:
  - roomLayerViewToJsonObject(): the stable machine contract a future level validator consumes.
  - renderRoomLayerCubeAscii(): an isometric "cube split into layers" rendered below the two graphs.
    Each layer is a room; the room's front face holds a bipartite matrix of the characters (rows) and
    items (columns) that shared that room, with X marking a co-presence. Row/column indices match the
    `[i]` legends of the character and item graphs printed above. */

import RoomLayerView, { RoomLayer } from "./types/RoomLayerView";

// Isometric offset (in characters) of the top and right faces. Must be small enough that adjacent
// layer-boundary diagonals never overlap: every room renders at least 2 content rows (see
// _renderRoomContentLines), so a depth of 3 leaves a clear gap between consecutive boundaries.
const CUBE_DEPTH = 3;

type RoomLayerViewJson = {
  level:string|null,
  characterLabels:string[],
  itemLabels:string[],
  rooms:Array<{ roomId:string, title:string, characterIndices:number[], itemIndices:number[], interactions:Array<{ characterIndex:number, itemIndex:number }> }>
};

export function roomLayerViewToJsonObject(view:RoomLayerView, levelName:string|null = null):RoomLayerViewJson {
  return {
    level:levelName,
    characterLabels:[...view.characterLabels],
    itemLabels:[...view.itemLabels],
    rooms:view.rooms.map(room => ({
      roomId:room.roomId,
      title:room.title,
      characterIndices:[...room.characterIndices],
      itemIndices:[...room.itemIndices],
      interactions:room.interactions.map(interaction => ({ characterIndex:interaction.characterIndex, itemIndex:interaction.itemIndex }))
    }))
  };
}

function _renderRoomContentLines(room:RoomLayer, characterIndexWidth:number, itemIndexWidth:number):string[] {
  const lines = [room.title.trim().length ? room.title : room.roomId]; // Some rooms are authored title-less; show the id so the layer is identifiable.
  if (!room.characterIndices.length || !room.itemIndices.length) {
    lines.push(''); // No characters or no items here means no matrix; keep a blank second row so the layer stays >= 2 rows tall (see CUBE_DEPTH) without widening the cube.
    return lines;
  }
  const cellWidth = Math.max(itemIndexWidth, 1);
  const rowLabelWidth = characterIndexWidth + 2; // "[" + index + "]".
  const interactions = new Set(room.interactions.map(interaction => `${interaction.characterIndex}|${interaction.itemIndex}`));
  const headerCells = room.itemIndices.map(itemIndex => String(itemIndex).padStart(cellWidth));
  lines.push(`${' '.repeat(rowLabelWidth + 1)}${headerCells.join(' ')}`);
  room.characterIndices.forEach(characterIndex => {
    const rowLabel = `[${String(characterIndex).padStart(characterIndexWidth)}]`;
    const cells = room.itemIndices.map(itemIndex => (interactions.has(`${characterIndex}|${itemIndex}`) ? 'X' : '.').padStart(cellWidth));
    lines.push(`${rowLabel} ${cells.join(' ')}`);
  });
  return lines;
}

/* Draws the stacked layers as one isometric cube on a character grid. The front faces stack
  left-aligned; the top face (top layer only) and a right face (all layers) are extruded up-right by
  CUBE_DEPTH. `roomBlocks` content lines are already padded to `innerWidth`. */
function _drawCube(roomBlocks:string[][], innerWidth:number):string[] {
  const depth = CUBE_DEPTH;
  const horizontalBorder = `+${'-'.repeat(innerWidth + 2)}+`;
  const frontLines:string[] = [];
  const borderRowIndices:number[] = [];
  borderRowIndices.push(frontLines.length); frontLines.push(horizontalBorder);
  roomBlocks.forEach(block => {
    block.forEach(line => frontLines.push(`| ${line} |`));
    borderRowIndices.push(frontLines.length); frontLines.push(horizontalBorder);
  });

  const frontRowCount = frontLines.length;
  const frontWidth = innerWidth + 4; // "| " + content + " |".
  const rightEdgeCol = frontWidth - 1; // The front face's right border column.
  const backRightCol = rightEdgeCol + depth;
  const totalRows = depth + frontRowCount;
  const totalCols = backRightCol + 1;
  const grid:string[][] = Array.from({ length:totalRows }, () => Array.from({ length:totalCols }, () => ' '));
  const put = (row:number, col:number, ch:string) => { if (row >= 0 && row < totalRows && col >= 0 && col < totalCols) grid[row][col] = ch; };

  // Front faces, dropped `depth` rows so the extruded faces have room above and to the right.
  frontLines.forEach((line, index) => { for (let col = 0; col < line.length; ++col) put(depth + index, col, line[col]); });

  // Top face: the front-top border shifted up-right by `depth`, joined by the two top diagonals.
  for (let col = 0; col < horizontalBorder.length; ++col) put(0, depth + col, horizontalBorder[col]);
  for (let k = 1; k < depth; ++k) {
    put(depth - k, k, '/');                // Left top edge: front-top-left -> back-top-left.
    put(depth - k, rightEdgeCol + k, '/'); // Right top edge: front-top-right -> back-top-right.
  }

  // Right face: a back-right vertical with a "+" at each layer boundary, and a diagonal per boundary
  // (the topmost coincides with the top face's right edge; the bottom one closes the cube).
  for (let row = 0; row < frontRowCount; ++row) put(row, backRightCol, '|');
  borderRowIndices.forEach(borderRowIndex => {
    put(borderRowIndex, backRightCol, '+');
    for (let k = 1; k < depth; ++k) put(depth + borderRowIndex - k, rightEdgeCol + k, '/');
  });

  return grid.map(row => row.join('').trimEnd());
}

export function renderRoomLayerCubeAscii(view:RoomLayerView, levelName:string|null = null):string {
  const header = `Room interaction cube${levelName ? ` — ${levelName}` : ''}  (layers = rooms, top to bottom = file order)`;
  const legend = [
    'Each layer is a room. Within a layer: rows = characters [i], columns = items [j]; X = the two shared that room at a sampled time.',
    'Character [i] and item [j] indices match the legends above.'
  ];
  if (!view.rooms.length) return `${header}\n\n${legend.join('\n')}\n\n(no rooms)\n`;

  const characterIndexWidth = String(Math.max(view.characterLabels.length - 1, 0)).length;
  const itemIndexWidth = String(Math.max(view.itemLabels.length - 1, 0)).length;
  const roomBlocks = view.rooms.map(room => _renderRoomContentLines(room, characterIndexWidth, itemIndexWidth));
  const innerWidth = Math.max(1, ...roomBlocks.flat().map(line => line.length));
  const paddedBlocks = roomBlocks.map(block => block.map(line => line.padEnd(innerWidth)));

  return `${header}\n\n${legend.join('\n')}\n\n${_drawCube(paddedBlocks, innerWidth).join('\n')}\n`;
}

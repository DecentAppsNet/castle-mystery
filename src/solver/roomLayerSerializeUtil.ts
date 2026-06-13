/* This module serializes a RoomLayerView two ways (see docs/adr-solver.md), mirroring the other two
  serializers:
  - roomLayerViewToJsonObject(): the stable machine contract a future level validator consumes.
  - renderRoomLayerCubeAscii(): an isometric "cube split into layers" rendered below the two graphs.
    Each layer is a room. Its front face holds a bipartite matrix with every character down the left
    (rows) and every item across the top (columns); a cell shows HH:MM of the first time that
    character and item shared that room, or is blank. The grid is the same shape and uses a single
    fixed cell width in every layer, so an item's column lines up vertically through the whole cube.
    Row/column indices match the `[i]` legends of the character and item graphs printed above. */

import RoomLayerView, { RoomLayer } from "./types/RoomLayerView";

// Isometric offset (in characters) of the top and left faces. Must be small enough that adjacent
// layer-boundary diagonals never overlap: every room renders at least 2 content rows (title +
// item-index header), so a depth of 3 leaves a clear gap between consecutive boundaries.
const CUBE_DEPTH = 3;

// Width of an HH:MM time cell; also the minimum column width so blank and timed cells align.
const TIME_CELL_WIDTH = 5;

type RoomLayerViewJson = {
  level:string|null,
  characterLabels:string[],
  itemLabels:string[],
  rooms:Array<{ roomId:string, title:string, characterIndices:number[], itemIndices:number[], interactions:Array<{ characterIndex:number, itemIndex:number, firstInteractionTime:number }> }>
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
      interactions:room.interactions.map(interaction => ({ characterIndex:interaction.characterIndex, itemIndex:interaction.itemIndex, firstInteractionTime:interaction.firstInteractionTime }))
    }))
  };
}

function _formatHoursMinutes(msecs:number):string {
  const totalMinutes = Math.floor(msecs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/* One layer's front-face lines: a title, an item-index header, then one row per character. Every
  character and item is shown (the same grid in every layer), so columns align across the cube;
  empty cells are blank, interacting cells show HH:MM of the first co-presence in this room. */
function _renderRoomContentLines(room:RoomLayer, characterCount:number, itemCount:number, characterIndexWidth:number, cellWidth:number):string[] {
  const gutter = ' '.repeat(characterIndexWidth + 3); // "[" + index + "]" + " ".
  const headerCells = Array.from({ length:itemCount }, (_unused, itemIndex) => String(itemIndex).padStart(cellWidth));
  const lines = [room.title.trim().length ? room.title : room.roomId, `${gutter}${headerCells.join(' ')}`];

  const timeByKey = new Map(room.interactions.map(interaction => [`${interaction.characterIndex}|${interaction.itemIndex}`, interaction.firstInteractionTime]));
  for (let characterIndex = 0; characterIndex < characterCount; ++characterIndex) {
    const rowLabel = `[${String(characterIndex).padStart(characterIndexWidth)}]`;
    const cells = Array.from({ length:itemCount }, (_unused, itemIndex) => {
      const time = timeByKey.get(`${characterIndex}|${itemIndex}`);
      return (time === undefined ? '' : _formatHoursMinutes(time)).padStart(cellWidth);
    });
    lines.push(`${rowLabel} ${cells.join(' ')}`);
  }
  return lines;
}

/* Draws the stacked layers as one isometric cube on a character grid. The front faces are shifted
  right by `depth` and down by `depth` so the top face and a left face extrude up-and-left from them
  (the cube's bulk grows toward the top-left, front face anchored bottom-right). `roomBlocks` content
  lines are already padded to `innerWidth`. */
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
  const leftEdgeCol = depth; // The front face's left border column; cols 0..depth-1 hold the left/top faces.
  const rightEdgeCol = leftEdgeCol + frontWidth - 1; // The front face's right border column.
  const totalRows = depth + frontRowCount;
  const totalCols = leftEdgeCol + frontWidth;
  const grid:string[][] = Array.from({ length:totalRows }, () => Array.from({ length:totalCols }, () => ' '));
  const put = (row:number, col:number, ch:string) => { if (row >= 0 && row < totalRows && col >= 0 && col < totalCols) grid[row][col] = ch; };

  // Front faces, dropped `depth` rows and shifted right `depth` cols so the extruded faces sit above and to the left.
  frontLines.forEach((line, index) => { for (let col = 0; col < line.length; ++col) put(depth + index, leftEdgeCol + col, line[col]); });

  // Top face: the front-top border shifted up-left by `depth`, joined by the two top diagonals.
  for (let col = 0; col < horizontalBorder.length; ++col) put(0, col, horizontalBorder[col]);
  for (let k = 1; k < depth; ++k) {
    put(depth - k, leftEdgeCol - k, '\\');  // Left top edge: front-top-left -> back-top-left.
    put(depth - k, rightEdgeCol - k, '\\'); // Right top edge: front-top-right -> back-top-right.
  }

  // Left face: a back-left vertical with a "+" at each layer boundary, and a diagonal per boundary
  // (the topmost coincides with the top face's left edge; the bottom one closes the cube).
  for (let row = 0; row < frontRowCount; ++row) put(row, 0, '|');
  borderRowIndices.forEach(borderRowIndex => {
    put(borderRowIndex, 0, '+');
    for (let k = 1; k < depth; ++k) put(depth + borderRowIndex - k, leftEdgeCol - k, '\\');
  });

  return grid.map(row => row.join('').trimEnd());
}

function _cellWidth(view:RoomLayerView, itemIndexWidth:number):number {
  let width = Math.max(TIME_CELL_WIDTH, itemIndexWidth);
  view.rooms.forEach(room => room.interactions.forEach(interaction => { width = Math.max(width, _formatHoursMinutes(interaction.firstInteractionTime).length); }));
  return width;
}

export function renderRoomLayerCubeAscii(view:RoomLayerView, levelName:string|null = null):string {
  const header = `Room interaction cube${levelName ? ` — ${levelName}` : ''}  (layers = rooms, top to bottom = file order)`;
  const legend = [
    'Each layer is a room. Rows = characters [i] (down the left), columns = items [j] (across the top).',
    'A cell shows HH:MM of the first time that character and item shared that room; blank means they never did.',
    'Character [i] and item [j] indices match the legends above; item columns line up vertically across layers.'
  ];
  if (!view.rooms.length) return `${header}\n\n${legend.join('\n')}\n\n(no rooms)\n`;

  const characterCount = view.characterLabels.length, itemCount = view.itemLabels.length;
  const characterIndexWidth = String(Math.max(characterCount - 1, 0)).length;
  const itemIndexWidth = String(Math.max(itemCount - 1, 0)).length;
  const cellWidth = _cellWidth(view, itemIndexWidth);
  const roomBlocks = view.rooms.map(room => _renderRoomContentLines(room, characterCount, itemCount, characterIndexWidth, cellWidth));
  const innerWidth = Math.max(1, ...roomBlocks.flat().map(line => line.length));
  const paddedBlocks = roomBlocks.map(block => block.map(line => line.padEnd(innerWidth)));

  return `${header}\n\n${legend.join('\n')}\n\n${_drawCube(paddedBlocks, innerWidth).join('\n')}\n`;
}

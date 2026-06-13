/* This module serializes a RoomLayerView two ways (see docs/adr-solver.md), mirroring the other two
  serializers:
  - roomLayerViewToJsonObject(): the stable machine contract a future level validator consumes.
  - renderRoomLayerCubeAscii(): each room is drawn as its own isometric 3D box (front + top + left
    faces) and the boxes are laid out in a grid matching the level map (gridRow/gridCol). A box's
    front face holds a bipartite matrix of just that room's interactions — the present characters
    down the left (rows), the present items across the top (columns) — and a cell shows HH:MM of the
    first time that character and item shared the room. Every room in the same grid column is padded
    to the widest room's width there, so a column of rooms reads as one aligned stack. Row/column
    indices match the `[i]` legends of the character and item graphs printed above. */

import { formatHoursMinutes, truncateLabel } from "./labelUtil";
import RoomLayerView, { RoomLayer } from "./types/RoomLayerView";

// Isometric offset (in characters) of each box's top and left faces.
const CUBE_DEPTH = 3;

// Width of an HH:MM time cell; also the minimum column width so blank and timed cells align.
const TIME_CELL_WIDTH = 5;

// Blank space between adjacent boxes in the layout grid.
const GRID_COL_GAP = 2, GRID_ROW_GAP = 1;

type RoomLayerViewJson = {
  level:string|null,
  characterLabels:string[],
  itemLabels:string[],
  rooms:Array<{ roomId:string, title:string, gridRow:number, gridCol:number, characterIndices:number[], itemIndices:number[], interactions:Array<{ characterIndex:number, itemIndex:number, firstInteractionTime:number }> }>
};

export function roomLayerViewToJsonObject(view:RoomLayerView, levelName:string|null = null):RoomLayerViewJson {
  return {
    level:levelName,
    characterLabels:[...view.characterLabels],
    itemLabels:[...view.itemLabels],
    rooms:view.rooms.map(room => ({
      roomId:room.roomId,
      title:room.title,
      gridRow:room.gridRow,
      gridCol:room.gridCol,
      characterIndices:[...room.characterIndices],
      itemIndices:[...room.itemIndices],
      interactions:room.interactions.map(interaction => ({ characterIndex:interaction.characterIndex, itemIndex:interaction.itemIndex, firstInteractionTime:interaction.firstInteractionTime }))
    }))
  };
}

/* One room's front-face lines: a title, an item-name header for the items present in the room, then
  one row per character present in the room (labelled by name). A cell shows HH:MM of that pair's
  first co-presence in this room, or is blank. Title-less rooms (some are authored that way) fall back
  to the room id. A room with no characters or no items has no matrix — just the title and a blank
  line. `cellWidth` is wide enough to hold the widest item name (so names head their columns) and
  `characterLabelWidth` the widest character name, both global so boxes align. */
function _renderRoomContentLines(room:RoomLayer, characterLabels:string[], itemLabels:string[], characterLabelWidth:number, cellWidth:number):string[] {
  const title = room.title.trim().length ? room.title : room.roomId;
  if (!room.characterIndices.length || !room.itemIndices.length) return [title, ''];

  const gutter = ' '.repeat(characterLabelWidth + 1);
  const headerCells = room.itemIndices.map(itemIndex => truncateLabel(itemLabels[itemIndex]).padStart(cellWidth));
  const lines = [title, `${gutter}${headerCells.join(' ')}`];

  const timeByKey = new Map(room.interactions.map(interaction => [`${interaction.characterIndex}|${interaction.itemIndex}`, interaction.firstInteractionTime]));
  room.characterIndices.forEach(characterIndex => {
    const rowLabel = truncateLabel(characterLabels[characterIndex]).padEnd(characterLabelWidth);
    const cells = room.itemIndices.map(itemIndex => {
      const time = timeByKey.get(`${characterIndex}|${itemIndex}`);
      return (time === undefined ? '' : formatHoursMinutes(time)).padStart(cellWidth);
    });
    lines.push(`${rowLabel} ${cells.join(' ')}`);
  });
  return lines;
}

/* Draws one or more stacked content blocks as a single isometric box on a character grid. The front
  face is shifted right by `depth` and down by `depth` so the top face and a left face extrude
  up-and-left from it (the box's bulk grows toward the top-left, front face anchored bottom-right).
  `roomBlocks` content lines are already padded to `innerWidth`. */
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

// Column width: wide enough for an HH:MM time and for the widest (truncated) item name that heads a column.
function _cellWidth(view:RoomLayerView):number {
  let width = TIME_CELL_WIDTH;
  view.rooms.forEach(room => room.itemIndices.forEach(itemIndex => { width = Math.max(width, truncateLabel(view.itemLabels[itemIndex]).length); }));
  return width;
}

// Left-gutter width: the widest (truncated) character name that labels a row.
function _characterLabelWidth(view:RoomLayerView):number {
  let width = 1;
  view.rooms.forEach(room => room.characterIndices.forEach(characterIndex => { width = Math.max(width, truncateLabel(view.characterLabels[characterIndex]).length); }));
  return width;
}

// Per grid column, the widest room's content width — every room in the column is padded to it so the
// column reads as one aligned stack of boxes.
function _columnInnerWidths(rooms:RoomLayer[], contentByRoom:string[][], gridColCount:number):number[] {
  const widths = Array.from({ length:gridColCount }, () => 1);
  rooms.forEach((room, index) => {
    const width = Math.max(1, ...contentByRoom[index].map(line => line.length));
    widths[room.gridCol] = Math.max(widths[room.gridCol], width);
  });
  return widths;
}

// Stamps each room's already-rendered box onto one canvas at its (gridRow, gridCol), spacing columns
// to the widest box per column and rows to the tallest box per row so nothing overlaps.
function _placeBoxesInGrid(rooms:RoomLayer[], boxes:string[][], gridRowCount:number, gridColCount:number):string[] {
  const colWidths = Array.from({ length:gridColCount }, () => 0);
  const rowHeights = Array.from({ length:gridRowCount }, () => 0);
  boxes.forEach((box, index) => {
    colWidths[rooms[index].gridCol] = Math.max(colWidths[rooms[index].gridCol], ...box.map(line => line.length), 0);
    rowHeights[rooms[index].gridRow] = Math.max(rowHeights[rooms[index].gridRow], box.length);
  });

  const colX = Array.from({ length:gridColCount }, () => 0);
  for (let col = 1; col < gridColCount; ++col) colX[col] = colX[col - 1] + colWidths[col - 1] + GRID_COL_GAP;
  const rowY = Array.from({ length:gridRowCount }, () => 0);
  for (let row = 1; row < gridRowCount; ++row) rowY[row] = rowY[row - 1] + rowHeights[row - 1] + GRID_ROW_GAP;

  const totalCols = Math.max(1, colX[gridColCount - 1] + colWidths[gridColCount - 1]);
  const totalRows = Math.max(1, rowY[gridRowCount - 1] + rowHeights[gridRowCount - 1]);
  const grid:string[][] = Array.from({ length:totalRows }, () => Array.from({ length:totalCols }, () => ' '));
  boxes.forEach((box, index) => {
    const originRow = rowY[rooms[index].gridRow], originCol = colX[rooms[index].gridCol];
    box.forEach((line, lineIndex) => { for (let col = 0; col < line.length; ++col) grid[originRow + lineIndex][originCol + col] = line[col]; });
  });
  return grid.map(row => row.join('').trimEnd());
}

export function renderRoomLayerCubeAscii(view:RoomLayerView, levelName:string|null = null):string {
  const header = `Room interaction cube${levelName ? ` — ${levelName}` : ''}  (rooms placed by level layout; each room is a 3D box)`;
  const legend = [
    'Each box is a room positioned to match the level map. Rows = characters (down the left), columns = items (across the top).',
    'A cell shows HH:MM of the first time that character and item shared that room; blank means they never did.',
    "Rooms in a column share the widest room's width."
  ];
  if (!view.rooms.length) return `${header}\n\n${legend.join('\n')}\n\n(no rooms)\n`;

  const characterLabelWidth = _characterLabelWidth(view);
  const cellWidth = _cellWidth(view);

  const contentByRoom = view.rooms.map(room => _renderRoomContentLines(room, view.characterLabels, view.itemLabels, characterLabelWidth, cellWidth));
  const gridRowCount = Math.max(0, ...view.rooms.map(room => room.gridRow)) + 1;
  const gridColCount = Math.max(0, ...view.rooms.map(room => room.gridCol)) + 1;
  const columnInnerWidths = _columnInnerWidths(view.rooms, contentByRoom, gridColCount);
  const boxes = view.rooms.map((room, index) => {
    const innerWidth = columnInnerWidths[room.gridCol];
    return _drawCube([contentByRoom[index].map(line => line.padEnd(innerWidth))], innerWidth);
  });

  return `${header}\n\n${legend.join('\n')}\n\n${_placeBoxesInGrid(view.rooms, boxes, gridRowCount, gridColCount).join('\n')}\n`;
}

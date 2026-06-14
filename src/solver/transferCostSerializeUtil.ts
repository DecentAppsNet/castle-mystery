/* Serializes a TransferCostTable two ways (see docs/adr-solver.md), mirroring the other serializers:
  - transferCostTableToJsonObject(): the stable machine contract a future validator/complexity score
    consumes — each cell carries its switch count and the ordered switch chain (character + time).
  - renderTransferCostTableAscii(): a bordered grid with characters down the left (rows) and items
    across the top (columns). Each cell stacks the time-respecting switch chain to reach that item —
    one "<character> → HH:MM" line per switch (∞ = unreachable, — = the row character already
    witnesses the item). Character names truncate as in the room cube (hard truncation, no marker);
    item names show in full. */

import { formatHoursMinutes, truncateLabel } from "./labelUtil";
import TransferCostTable, { TransferCostCell } from "./types/TransferCostTable";

const UNREACHABLE_TEXT = '∞';
const WITNESS_TEXT = '—'; // The row character already witnesses the item (0 switches, no chain).

type TransferCostTableJson = {
  level:string|null,
  items:Array<{ id:string, title:string }>,
  rows:Array<{ characterId:string, characterTitle:string, cells:Array<{ cost:number|null, switches:Array<{ characterId:string, characterTitle:string, time:number }> }> }>
};

export function transferCostTableToJsonObject(table:TransferCostTable, levelName:string|null = null):TransferCostTableJson {
  return {
    level:levelName,
    items:table.items.map(item => ({ id:item.id, title:item.title })),
    rows:table.rows.map(row => ({
      characterId:row.characterId,
      characterTitle:row.characterTitle,
      cells:row.cells.map(cell => ({
        cost:cell.cost,
        switches:cell.switches.map(step => ({ characterId:step.characterId, characterTitle:step.characterTitle, time:step.time }))
      }))
    }))
  };
}

// The stacked lines for one cell: one "<character> → HH:MM" per switch (the → separates the character
// to switch to from the time the switch happens), or a single ∞ / — marker.
function _cellLines(cell:TransferCostCell):string[] {
  if (cell.cost === null) return [UNREACHABLE_TEXT];
  if (cell.cost === 0) return [WITNESS_TEXT];
  return cell.switches.map(step => `${truncateLabel(step.characterTitle)} → ${formatHoursMinutes(step.time)}`);
}

/* A bordered grid: a `+--+` rule below the header and after every character block, and `| cell |`
  columns. The first column holds the character names; the rest are the items. A character whose chain
  to an item needs several switches makes a multi-line block — the switches stack and the continuation
  lines share the same borders, with their label and the other columns left blank. */
function _renderGridLines(table:TransferCostTable):string[] {
  const rowLabelWidth = Math.max(1, ...table.rows.map(row => truncateLabel(row.characterTitle).length));
  const cellLinesByRow = table.rows.map(row => row.cells.map(_cellLines));
  const itemColumnWidths = table.items.map((item, columnIndex) =>
    Math.max(item.title.length, ...cellLinesByRow.map(rowCellLines => Math.max(0, ...rowCellLines[columnIndex].map(line => line.length)))));
  const columnWidths = [rowLabelWidth, ...itemColumnWidths];

  const border = `+${columnWidths.map(width => '-'.repeat(width + 2)).join('+')}+`;
  const toRow = (cells:string[]):string => `|${cells.map((cell, index) => ` ${cell.padEnd(columnWidths[index])} `).join('|')}|`;

  const lines = [border, toRow(['', ...table.items.map(item => item.title)]), border];
  table.rows.forEach((row, rowIndex) => {
    const rowCellLines = cellLinesByRow[rowIndex];
    const blockHeight = Math.max(1, ...rowCellLines.map(cellLines => cellLines.length));
    for (let lineIndex = 0; lineIndex < blockHeight; ++lineIndex) {
      const labelCell = lineIndex === 0 ? truncateLabel(row.characterTitle) : '';
      lines.push(toRow([labelCell, ...rowCellLines.map(cellLines => cellLines[lineIndex] ?? '')]));
    }
    lines.push(border);
  });
  return lines;
}

export function renderTransferCostTableAscii(table:TransferCostTable, levelName:string|null = null):string {
  const header = `Item access cost${levelName ? ` — ${levelName}` : ''}  (time-respecting character switches to reach each item)`;
  const legend = `Rows = characters, columns = items. Each cell stacks the fewest-switch chain (switch times non-decreasing) to a character co-present with the item — one "character → HH:MM" per switch (the → separates whom to switch to from when), top to bottom; ${WITNESS_TEXT} = already co-present (0 switches); ${UNREACHABLE_TEXT} = no such chain.`;
  const body = (!table.rows.length || !table.items.length)
    ? '(no characters or items to relate)'
    : _renderGridLines(table).join('\n');
  return `${header}\n\n${legend}\n\n${body}\n`;
}

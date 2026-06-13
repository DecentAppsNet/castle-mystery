/* Serializes a TransferCostTable two ways (see docs/adr-solver.md), mirroring the other serializers:
  - transferCostTableToJsonObject(): the stable machine contract a future validator/complexity score
    consumes.
  - renderTransferCostTableAscii(): a human-readable grid with characters down the left (rows) and
    items across the top (columns). Character names use the same truncation as the room cube; item
    names are shown in full. Each cell is the minimum number of character transfers from that
    character to the item, or ∞ when no chain of switches reaches it. */

import { truncateLabel } from "./labelUtil";
import TransferCostTable from "./types/TransferCostTable";

const UNREACHABLE_TEXT = '∞';

type TransferCostTableJson = {
  level:string|null,
  items:Array<{ id:string, title:string }>,
  rows:Array<{ characterId:string, characterTitle:string, costs:(number|null)[] }>
};

export function transferCostTableToJsonObject(table:TransferCostTable, levelName:string|null = null):TransferCostTableJson {
  return {
    level:levelName,
    items:table.items.map(item => ({ id:item.id, title:item.title })),
    rows:table.rows.map(row => ({ characterId:row.characterId, characterTitle:row.characterTitle, costs:[...row.costs] }))
  };
}

function _costText(cost:number|null):string {
  return cost === null ? UNREACHABLE_TEXT : String(cost);
}

function _renderGridLines(table:TransferCostTable):string[] {
  const rowLabelWidth = Math.max(1, ...table.rows.map(row => truncateLabel(row.characterTitle).length));
  const columnWidths = table.items.map((item, columnIndex) =>
    Math.max(item.title.length, ...table.rows.map(row => _costText(row.costs[columnIndex]).length)));

  const gutter = ' '.repeat(rowLabelWidth);
  const lines = [`${gutter}  ${table.items.map((item, index) => item.title.padStart(columnWidths[index])).join('  ')}`];
  table.rows.forEach(row => {
    const label = truncateLabel(row.characterTitle).padEnd(rowLabelWidth);
    const cells = row.costs.map((cost, index) => _costText(cost).padStart(columnWidths[index]));
    lines.push(`${label}  ${cells.join('  ')}`);
  });
  return lines;
}

export function renderTransferCostTableAscii(table:TransferCostTable, levelName:string|null = null):string {
  const header = `Item access cost${levelName ? ` — ${levelName}` : ''}  (min character transfers to reach each item)`;
  const legend = `Rows = characters, columns = items. A cell is the fewest character switches from that character to one co-present with the item (0 = already co-present); ${UNREACHABLE_TEXT} = unreachable.`;
  const body = (!table.rows.length || !table.items.length)
    ? '(no characters or items to relate)'
    : _renderGridLines(table).join('\n');
  return `${header}\n\n${legend}\n\n${body}\n`;
}

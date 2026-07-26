import { parseUniqueNameValueLines, SectionEntryWithLine } from "@/common/markdownUtil";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { createNormalizedSectionEntryMap, parseBoolean, parseNumber } from "../levelFileSectionUtil";
import { assertNonNullable } from "decent-portal";
import SectionEntryMap from "../types/SectionEntryMap";
import Item, { createDefaultItem } from "@/game/types/Item";
import { getItemImageAssetUrl } from "@/game/imageUrlUtil";
import { rand } from "@/common/randUtil";
import { normalizeId } from "@/game/idUtil";
import Room from "@/game/types/Room";
import { ROOM_ROW_DEPTH } from "@/game/roomSpaceConstants";
import { COLUMN_WIDTH } from "@/game/roomGridUtil";
import LegendGrid from "../roomLoading/types/LegendGrid";

function _createStubItem(itemId:string):Item {
  return {...createDefaultItem(), id:itemId, description:'Stub Item'};
}

export function parseItems(itemsText:string):Item[] {
  if (!itemsText) return [];
  const items = itemsText
    .split('|')
    .map(normalizeId)
    .map(itemId => _createStubItem(itemId));
  return items;
}

export function parseItem(itemText:string):Item|null {
  if (!itemText) return null;
  const itemId = normalizeId(itemText);
  return _createStubItem(itemId);
}

function _parseItem(itemId:string, itemSectionEntry:SectionEntryWithLine, errors:ErrorCollector):Item {
  const authoredItemName = itemSectionEntry.name;
  const itemSection = itemSectionEntry.value;
  const nameValues = parseUniqueNameValueLines(itemSection, `item ${itemId}`, false, itemSectionEntry.lineNo);

  const title = nameValues.title ?? authoredItemName;
  const description = nameValues.description ?? '';
  const imageUrl = nameValues.image ? getItemImageAssetUrl(nameValues.image.trim()) : null;
  const isVisible = parseBoolean(nameValues.visible ?? 'true', errors, ['items', itemId], 'visible');
  const drawOffset = {
    x:parseNumber(nameValues.drawOffsetX ?? '0', errors, ['items', itemId], 'drawOffsetX'),
    y:parseNumber(nameValues.drawOffsetY ?? '0', errors, ['items', itemId], 'drawOffsetY'),
    z:parseNumber(nameValues.drawOffsetZ ?? '0', errors, ['items', itemId], 'drawOffsetZ')
  };
  const stackOffset = {
    x:parseNumber(nameValues.stackOffsetX ?? '0', errors, ['items', itemId], 'stackOffsetX'),
    y:parseNumber(nameValues.stackOffsetY ?? '0', errors, ['items', itemId], 'stackOffsetY'),
    z:parseNumber(nameValues.stackOffsetZ ?? '0', errors, ['items', itemId], 'stackOffsetZ')
  }
  const position = {x:0, y:0, z:0}; // Set later based on room legends.

  const item:Item = {
    id:itemId,
    randomSalt:rand(),
    title,
    description,
    imageUrl,
    isVisible,
    position,
    drawOffset,
    stackOffset,
    isDiscovered:false
  }

  return item;
}

export function setRoomItemPositions(room:Room, roomLegendGrid:LegendGrid) {
  roomLegendGrid.entries.forEach(entry => { 
    const { col, row, id } = entry;
    const x = room.rect.x + col * COLUMN_WIDTH;
    const y = room.rect.y + room.rect.height;
    const z = row * ROOM_ROW_DEPTH;
    const item = room.items.find(i => i.id === id);
    if (!item) return;
    item.position = {x, y, z};
  });
}

export function loadItemsPartially(itemsSectionText:string, errors:ErrorCollector):Item[]|null {
  const originalErrorCount = errors.count;

  if (!itemsSectionText) return [];

  const itemSectionsById:SectionEntryMap = createNormalizedSectionEntryMap(itemsSectionText, 2, 'items', errors);
  const itemIds:string[] = [...itemSectionsById.keys()];
  const items = itemIds.map(itemId => {
    const sectionEntry = itemSectionsById.get(itemId);
    assertNonNullable(sectionEntry);
    return _parseItem(itemId, sectionEntry, errors)
  });
  
  return errors.count <= originalErrorCount ? items : null;
}

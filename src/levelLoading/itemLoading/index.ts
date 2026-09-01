/* This file parses authored item definitions and references, then indexes items used by a loaded level.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { parseUniqueNameValueLines, SectionEntryWithLine } from "@/common/markdownUtil";
import { ErrorCollector } from "../errorCollection";
import { createNormalizedSectionEntryMap, parseBoolean, parseNumber } from "../levelFileSectionUtil";
import { assertNonNullable } from "decent-portal";
import SectionEntryMap from "../types/SectionEntryMap";
import Item, { createDefaultItem, MutableItem } from "@/game/types/Item";
import { getItemImageAssetUrl } from "@/game/imageUrlUtil";
import { rand } from "@/common/randUtil";
import { normalizeId } from "@/game/idUtil";
import { createDefaultPosition } from "@/game/types/Position";
import { MutableLevel } from "@/game/types/Level";
import Room from "@/game/types/Room";
import Activity from "../activityLoading/types/Activity";

function _createStubItem(itemId:string):Item {
  return {...createDefaultItem(), id:itemId, description:'Stub Item'};
}

/** Parses pipe-delimited item references into normalized stub items. */
export function parseItems(itemsText:string):Item[] {
  if (!itemsText) return [];
  const items = itemsText
    .split('|')
    .map(normalizeId)
    .map(itemId => _createStubItem(itemId));
  return items;
}

/** Parses one item reference into a normalized stub item, or returns null for empty text. */
export function parseItem(itemText:string):Item|null {
  if (!itemText) return null;
  const itemId = normalizeId(itemText);
  return _createStubItem(itemId);
}

function _parseItem(itemId:string, itemSectionEntry:SectionEntryWithLine, errors:ErrorCollector):MutableItem {
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
  const position = createDefaultPosition(); // Set later based on room legends.

  const item:Item = {
    id:itemId,
    randomSalt:rand(),
    title,
    description,
    imageUrl,
    isVisible,
    position,
    drawOffset,
    stackOffset
  }

  return item;
}

/** Parses item metadata while leaving positions to be assigned from room legends. */
export function loadItemsPartially(itemsSectionText:string, errors:ErrorCollector):MutableItem[]|null {
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

/** Finds items placed in rooms or character hands, or referenced by an activity. */
function _findUsedItemIds(activities:readonly Activity[], rooms:readonly Room[], level:MutableLevel):Set<string> {
  const itemIds = new Set<string>();
  rooms.forEach(room => room.items.forEach(item => itemIds.add(item.id)));
  level.characters.forEach(character => {
    if (character.leftHandItem) itemIds.add(character.leftHandItem.id);
    if (character.rightHandItem) itemIds.add(character.rightHandItem.id);
  });
  activities.forEach(activity => {
    const { itemId, toItemId } = activity.parts;
    if (typeof itemId === 'string') itemIds.add(itemId);
    if (typeof toItemId === 'string') itemIds.add(toItemId);
  });
  return itemIds;
}

/** Indexes item definitions referenced by initial placement or activities. */
export function indexUsedItemsInLevel(items:Item[], activities:readonly Activity[], rooms:readonly Room[],
    level:MutableLevel, _errors:ErrorCollector):boolean {
  const usedItemIds = _findUsedItemIds(activities, rooms, level);
  items
    .filter(item => usedItemIds.has(item.id))
    .forEach(item => level.itemsById.set(item.id, item));
  return true;
}
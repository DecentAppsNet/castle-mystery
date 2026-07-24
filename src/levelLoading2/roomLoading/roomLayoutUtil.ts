import { assert, assertNonNullable } from "decent-portal";

import ErrorCollector from "../errorCollection/ErrorCollector";
import { parseUniqueNameValueLines } from "@/common/markdownUtil";
import { normalizeId } from "@/game/idUtil";
import { MAP_TILE_SIZE } from "@/game/roomGridUtil";
import { areRoomsWellOrdered, sortRoomsForDrawingOrder } from "./roomOrderingUtil";
import { createNormalizedSectionEntryMap } from "../levelFileSectionUtil";
import Room, { createDefaultRoom } from "@/game/types/Room";
import Texture from "@/game/types/Texture";
import { parseRoomTexture } from "./parseTextureUtil";
import { getUniqueIdsFromLegendGrid, parseLegendGrid } from "./legendGridUtil";
import LegendGrid from "./types/LegendGrid";
import { parseItems, setRoomItemPositions } from "../itemLoading/itemLoadingApi";
import Item from "@/game/types/Item";

type RoomStyle = Readonly<{
  backWallTexture:string|undefined,
  floorTexture:string|undefined,
  stairTexture:string|undefined,
  doorTexture:string|undefined,
  rightWallTexture:string|undefined
}>;

function _createNormalizedRoomSectionIds(roomsSectionText:string, errors:ErrorCollector):Set<string> {
  const entries = createNormalizedSectionEntryMap(roomsSectionText, 2, 'rooms', errors);
  return new Set(Array.from(entries.keys()));
}

function _findRoomStyle(roomStyleText:string, roomStyleById:Map<string, RoomStyle>):RoomStyle|null {
  const roomStyleId = normalizeId(roomStyleText);
  return roomStyleById.get(roomStyleId) ?? null;
}

function _createRoomStyle(roomStyleSection:string, roomStyleId:string, lineNo:number):RoomStyle {
  const roomStyleNameValues = parseUniqueNameValueLines(roomStyleSection, `room style ${roomStyleId}`, false, lineNo + 1);
  return {
    backWallTexture:roomStyleNameValues.backWallTexture,
    floorTexture:roomStyleNameValues.floorTexture,
    stairTexture:roomStyleNameValues.stairTexture,
    doorTexture:roomStyleNameValues.doorTexture,
    rightWallTexture:roomStyleNameValues.rightWallTexture
  };
}

function _createRoomStyleById(roomStylesSection:string, errors:ErrorCollector):Map<string, RoomStyle> {
  const roomStyleEntriesById = createNormalizedSectionEntryMap(roomStylesSection, 2, 'room styles', errors);
  const roomStyleMetadataById = new Map<string, RoomStyle>();
  roomStyleEntriesById.forEach((roomStyleEntry, roomStyleId) => {
    roomStyleMetadataById.set(roomStyleId, _createRoomStyle(roomStyleEntry.value, roomStyleId, roomStyleEntry.lineNo));
  });
  return roomStyleMetadataById;
}

function _resolveRoomTextureOverride(roomNameValues:Record<string, string>, 
    propertyName:'backWallTexture'|'floorTexture'|'stairTexture'|'doorTexture'|'rightWallTexture',
    room:Room, verticalUnitLabel:'layers'|'rows', inheritedTextureValue:string|undefined,
    errors:ErrorCollector):Texture|null {
  const textureValue = Object.hasOwn(roomNameValues, propertyName)
    ? roomNameValues[propertyName]
    : inheritedTextureValue;
  return parseRoomTexture(textureValue, room, propertyName, verticalUnitLabel, errors);
}

function _createItemsForRoom(room:Room, itemsText:string, roomSectionText:string, errors:ErrorCollector):Item[] {
  const items:Item[] = parseItems(itemsText);
  const roomLegendGrid = parseLegendGrid(roomSectionText, errors, ['rooms', room.id]);
  if (!roomLegendGrid) return [];
  setRoomItemPositions(room, roomLegendGrid);
  return items;
}

export function applyRoomMetaDataFromSections(roomsSectionText:string, roomStylesSectionText:string, rooms:Room[], errors:ErrorCollector) {
  const roomSectionsById = createNormalizedSectionEntryMap(roomsSectionText, 2, 'rooms', errors);
  const roomStyleMetadataById = _createRoomStyleById(roomStylesSectionText, errors);
  rooms.forEach((room, roomI) => {
    const roomSectionEntry = roomSectionsById.get(room.id);
    assertNonNullable(roomSectionEntry);
    const roomNameValues = parseUniqueNameValueLines(roomSectionEntry.value, `room ${room.id}`, false, roomSectionEntry.lineNo + 1);
    const inheritedRoomStyle = roomNameValues.style
      ? _findRoomStyle(roomNameValues.style, roomStyleMetadataById)
      : null;
    const title = Object.hasOwn(roomNameValues, 'title') ? roomNameValues.title : roomSectionEntry.name.trim();
    const items = _createItemsForRoom(room, roomNameValues.items, roomSectionEntry.value, errors);
    rooms[roomI] = {
      ...room,
      title,
      items,
      isOutside: (roomNameValues.outside || '').toLowerCase() === 'true',
      backWallTexture:_resolveRoomTextureOverride(roomNameValues, 'backWallTexture', room, 'layers', inheritedRoomStyle?.backWallTexture, errors),
      floorTexture:_resolveRoomTextureOverride(roomNameValues, 'floorTexture', room, 'rows', inheritedRoomStyle?.floorTexture, errors),
      stairTexture:_resolveRoomTextureOverride(roomNameValues, 'stairTexture', room, 'layers', inheritedRoomStyle?.stairTexture, errors),
      doorTexture:_resolveRoomTextureOverride(roomNameValues, 'doorTexture', room, 'layers', inheritedRoomStyle?.doorTexture, errors),
      rightWallTexture:_resolveRoomTextureOverride(roomNameValues, 'rightWallTexture', room, 'layers', inheritedRoomStyle?.rightWallTexture, errors),
      isObscured: (roomNameValues.obscured || '').toLowerCase() === 'true'
    };
  });
}

export function createRoomsFromMapSection(mapLegendGrid:LegendGrid, errors:ErrorCollector):Room[] {
  errors.matchNextLine('map', '```', '```'); // Default location for all error messages.
  const originalErrorCount = errors.count;

  if (!mapLegendGrid) return [];
  const roomBoundsById = new Map<string, { authoredName:string, minCol:number, maxCol:number, minRow:number, maxRow:number }>();
  const roomTileCountById = new Map<string, number>();

  mapLegendGrid.entries.forEach(entry => {
    const { id:roomId, col, row, authoredName } = entry;
    const existingBounds = roomBoundsById.get(roomId);
    if (!existingBounds) {
      roomBoundsById.set(roomId, { minCol:col, maxCol:col, minRow:row, maxRow:row, authoredName });
      roomTileCountById.set(roomId, 1);
      return;
    }
    existingBounds.minCol = Math.min(existingBounds.minCol, col);
    existingBounds.maxCol = Math.max(existingBounds.maxCol, col);
    existingBounds.minRow = Math.min(existingBounds.minRow, row);
    existingBounds.maxRow = Math.max(existingBounds.maxRow, row);
    roomTileCountById.set(roomId, (roomTileCountById.get(roomId) || 0) + 1);
  });

  const rooms = Array.from(roomBoundsById.entries()).map(([roomId, bounds]) => {
    const expectedTileCount = (bounds.maxCol - bounds.minCol + 1) * (bounds.maxRow - bounds.minRow + 1);
    const actualTileCount = roomTileCountById.get(roomId) || 0;
    if (actualTileCount !== expectedTileCount) errors.add('Map tiles for ${roomId} cover a non-rect area.');
    return {
      ...createDefaultRoom(),
      id: roomId,
      title: bounds.authoredName.trim(),
      rect: {
        x: bounds.minCol * MAP_TILE_SIZE,
        y: bounds.minRow * MAP_TILE_SIZE,
        width: (bounds.maxCol - bounds.minCol + 1) * MAP_TILE_SIZE,
        height: (bounds.maxRow - bounds.minRow + 1) * MAP_TILE_SIZE
      }
    };
  });

  const sortedRooms = sortRoomsForDrawingOrder(rooms);
  assert(areRoomsWellOrdered(sortedRooms), 'rooms could not be ordered for drawing');
  
  return errors.count <= originalErrorCount ? sortedRooms : [];
}

export function validateMapLegendRoomsExistInRoomsSection(mapLegendGrid:LegendGrid, roomsSection:string, errors:ErrorCollector):boolean {
  const orginalErrorCount =  errors.count;
  const roomIds = getUniqueIdsFromLegendGrid(mapLegendGrid);
  const roomSectionIds = _createNormalizedRoomSectionIds(roomsSection, errors);
  Object.values(roomIds).forEach(roomId => {
    if (roomSectionIds.has(roomId)) return;
    errors.addAt(`Map legend room "${roomId}" does not have corresponding definition in "rooms" section`, 
      'map', '```', '```');
  });
  return errors.count <= orginalErrorCount;
}
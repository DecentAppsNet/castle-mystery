import { MutableLevel } from "@/game/types/Level";
import LevelLoadingContext from "../types/LevelLoadingContext";
import ErrorCollector from "../errorCollection/ErrorCollector";
import LevelFileSections from "../types/LevelFileSections";
import { parseFirstFencedCodeBlockLines, parseOptions, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { normalizeId } from "@/game/idUtil";
import { MAP_TILE_SIZE } from "@/game/roomGridUtil";
import { areRoomsWellOrdered, sortRoomsForDrawingOrder } from "./roomOrderingUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom } from "@/game/roomUtil";
import LevelFileSection from "../types/LevelFileSection";
import { createNormalizedSectionEntryMap } from "../levelFileSectionUtil";
import Room from "@/game/types/Room";
import Texture from "@/game/types/Texture";
import { parseRoomTexture } from "./parseTextureUtil";
import { findGroundFloorY, validateOutsideRoomsAgainstGroundFloor } from "./groundFloorUtil";
import { findLegendEntryText, findLegendTilesInGrid, validateLegendMatchesGrid } from "./gridAndLegendUtil";

type RoomStyleMetadata = Readonly<{
  backWallTexture:string|undefined,
  floorTexture:string|undefined,
  stairTexture:string|undefined,
  doorTexture:string|undefined,
  rightWallTexture:string|undefined
}>;

export function validateRoomGridLegendEntries(rooms:Room[], roomsSection:LevelFileSection, 
    knownPopulationEntryIds:Set<string>, errors:ErrorCollector) {
  const roomSectionsById = createNormalizedSectionEntryMap(roomsSection.text, 2, 'rooms', errors);

  Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
    const roomSection = roomSectionEntry.value;
    const room = findRoom(rooms, roomId);
    if (!room) throw new Error(`room with id ${roomId} not found`);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const roomNameValues = parseUniqueNameValueLines(roomSection, `room ${roomId}`, false, roomSectionEntry.lineNo + 1);
    const roomLegend = Object.fromEntries(
      Object.entries(roomNameValues).filter(([name]) => name !== 'exits' && name !== 'obscured' && name !== 'outside' && name !== 'style' && name !== 'backWallTexture' && name !== 'floorTexture' && name !== 'stairTexture' && name !== 'doorTexture' && name !== 'rightWallTexture')
    );

    findLegendTilesInGrid(gridLines, roomLegend, errors).forEach(({ entryId:entryText, row, col }) => {
      parseOptions(entryText).forEach(populationEntryText => {
        if (knownPopulationEntryIds.has(normalizeId(populationEntryText))) return;
        throw new Error(`unknown room legend entry '${populationEntryText}' at row ${row + 1}, col ${col + 1} in room ${room.title}`);
      });
    });
  });
}

//
// Clean line - all functions below were reviewed and accepted
//

function _validateMapLegendRoomsExistInRoomsSection(legend:Record<string, string>, roomsSection:string, errors:ErrorCollector):boolean {
  const orginalErrorCount =  errors.errorCount;
  const roomSectionIds = _createNormalizedRoomSectionIds(roomsSection, errors);
  Object.values(legend).forEach(roomName => {
    const roomId = normalizeId(roomName);
    if (roomSectionIds.has(roomId)) return;
    errors.addParseErrorAtLine('NOLEGROOM', 'map legend room "${roomName}" to have corresponding definition in "rooms" section', 
      'no room definition for "${roomName}"', 'Check for naming mistake or add room definition.', 0, 0, 0, 'map');
  });
  return errors.errorCount <= orginalErrorCount;
}

function _findRoomStyleMetadata(roomStyleText:string, roomStyleMetadataById:Map<string, RoomStyleMetadata>):RoomStyleMetadata|null {
  const roomStyleId = normalizeId(roomStyleText);
  return roomStyleMetadataById.get(roomStyleId) ?? null;
}

function _createRoomStyleMetadata(roomStyleSection:string, roomStyleId:string, lineNo:number):RoomStyleMetadata {
  const roomStyleNameValues = parseUniqueNameValueLines(roomStyleSection, `room style ${roomStyleId}`, false, lineNo + 1);
  return {
    backWallTexture:roomStyleNameValues.backWallTexture,
    floorTexture:roomStyleNameValues.floorTexture,
    stairTexture:roomStyleNameValues.stairTexture,
    doorTexture:roomStyleNameValues.doorTexture,
    rightWallTexture:roomStyleNameValues.rightWallTexture
  };
}

function _createRoomStyleMetadataById(roomStylesSection:string, errors:ErrorCollector):Map<string, RoomStyleMetadata> {
  const roomStyleEntriesById = createNormalizedSectionEntryMap(roomStylesSection, 2, 'room styles', errors);
  const roomStyleMetadataById = new Map<string, RoomStyleMetadata>();
  roomStyleEntriesById.forEach((roomStyleEntry, roomStyleId) => {
    roomStyleMetadataById.set(roomStyleId, _createRoomStyleMetadata(roomStyleEntry.value, roomStyleId, roomStyleEntry.lineNo));
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

function _applyRoomMetadataFromSections(roomsSectionText:string, roomStylesSectionText:string, rooms:Room[], errors:ErrorCollector) {
  const roomSectionsById = createNormalizedSectionEntryMap(roomsSectionText, 2, 'rooms', errors);
  const roomStyleMetadataById = _createRoomStyleMetadataById(roomStylesSectionText, errors);
  rooms.forEach((room, index) => {
    const roomSectionEntry = roomSectionsById.get(room.id);
    assertNonNullable(roomSectionEntry);
    const roomNameValues = parseUniqueNameValueLines(roomSectionEntry.value, `room ${room.id}`, false, roomSectionEntry.lineNo + 1);
    const inheritedRoomStyle = roomNameValues.style
      ? _findRoomStyleMetadata(roomNameValues.style, roomStyleMetadataById)
      : null;
    const title = Object.hasOwn(roomNameValues, 'title')
      ? roomNameValues.title
      : roomSectionEntry.authoredName.trim();
    rooms[index] = {
      ...room,
      title,
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

function _validateMapSectionIsPresent(mapSection:string, errors:ErrorCollector):boolean {
  if (mapSection.trim().length > 0) return true;
  errors.addParseErrorAtLine('NOMAP', 'a "map" section ', 'no "map" section', 'Add a "map" section.', 0, 0, 0, 'map');
  return false;
}

function _validateMapGridIsPresent(mapLines:string[], errors:ErrorCollector):boolean {
  if (mapLines.length > 0) return true;
  errors.addParseErrorAtLine('MAPNOGRID', 'fenced code containing map grid', 'no lines in the "map" section', 'Add a map grid.', 0, 0, 0, 'map');
  return false;
}

function _createNormalizedRoomSectionIds(roomsSectionText:string, errors:ErrorCollector):Set<string> {
  const entries = createNormalizedSectionEntryMap(roomsSectionText, 2, 'rooms', errors);
  return new Set(Array.from(entries.keys()));
}

function _validateMapLegendRoomsAgainstRoomsSection(mapSectionText:string, roomsSectionText:string, errors:ErrorCollector):boolean {
  if (!_validateMapSectionIsPresent(mapSectionText, errors)) return false;
  const mapLines = parseFirstFencedCodeBlockLines(mapSectionText);
  if (!_validateMapGridIsPresent(mapLines, errors)) return false;
  const legend = parseUniqueNameValueLines(mapSectionText, 'map legend', false, errors.getSectionFirstLineNo('map'));
  const usedMapLegendChars = findUsedMapLegendChars(mapLines);
  if (!validateLegendMatchesGrid(legend, usedMapLegendChars, errors)) return false;
  return _validateMapLegendRoomsExistInRoomsSection(legend, roomsSectionText, errors);
}

function _createRoomsFromMapSection(mapSectionText:string, errors:ErrorCollector):Room[] {
  errors.setLine(0, 'map'); // Default location for all error messages - top of the map section.
  const originalErrorCount = errors.errorCount;

  const mapLines = parseFirstFencedCodeBlockLines(mapSectionText);
  if (!_validateMapGridIsPresent(mapLines, errors)) return [];
  const legend = parseUniqueNameValueLines(mapSectionText, 'map legend', false, errors.getSectionFirstLineNo('map'));
  if (!validateLegendMatchesGrid(legend, findUsedMapLegendChars(mapLines), errors)) return [];
  const roomBoundsById = new Map<string, { authoredName:string, tileChar:string, minCol:number, maxCol:number, minRow:number, maxRow:number }>();
  const roomTileCountById = new Map<string, number>();

  mapLines.forEach((line, row) => {
    Array.from(line).forEach((tileChar, col) => {
      const authoredRoomName = findLegendEntryText(tileChar, legend, row, col, 'map', errors);
      if (!authoredRoomName) return;
      const roomId = normalizeId(authoredRoomName);
      const existingBounds = roomBoundsById.get(roomId);
      if (!existingBounds) {
        roomBoundsById.set(roomId, { authoredName:authoredRoomName, tileChar, minCol:col, maxCol:col, minRow:row, maxRow:row });
        roomTileCountById.set(roomId, 1);
        return;
      }
      if (existingBounds.tileChar !== tileChar) {
        errors.addParseError('DUPELEGROOMID', `unique room ID`, 
          `duplicate room ID "${authoredRoomName}" conflicting with '${existingBounds.authoredName}' in map legend`, 
          'Legend tiles should reference unique rooms.', 0, 0);
        return;
      }
      existingBounds.minCol = Math.min(existingBounds.minCol, col);
      existingBounds.maxCol = Math.max(existingBounds.maxCol, col);
      existingBounds.minRow = Math.min(existingBounds.minRow, row);
      existingBounds.maxRow = Math.max(existingBounds.maxRow, row);
      roomTileCountById.set(roomId, (roomTileCountById.get(roomId) || 0) + 1);
    });
  });

  const rooms = Array.from(roomBoundsById.entries()).map(([roomId, bounds]) => {
    const expectedTileCount = (bounds.maxCol - bounds.minCol + 1) * (bounds.maxRow - bounds.minRow + 1);
    const actualTileCount = roomTileCountById.get(roomId) || 0;
    if (actualTileCount !== expectedTileCount) {
      errors.addParseError('NONRECTROOM', 'map tiles for ${roomId} to cover a rectangular area', 'covered a non-rect area', 
        'Make all tiles for each room adjacent and filling a rectangular area.', 0, 0);
    }
    return {
      id: roomId,
      title: bounds.authoredName.trim(),
      rect: {
        x: bounds.minCol * MAP_TILE_SIZE,
        y: bounds.minRow * MAP_TILE_SIZE,
        width: (bounds.maxCol - bounds.minCol + 1) * MAP_TILE_SIZE,
        height: (bounds.maxRow - bounds.minRow + 1) * MAP_TILE_SIZE
      },
      isOutside: false,
      backWallTexture:null,
      floorTexture:null,
      stairTexture:null,
      doorTexture:null,
      rightWallTexture:null,
      isObscured: false,
      items: [],
      exits: [],
      stairParts: [],
      waypoints: [],
      isDiscovered: false
    };
  });

  const sortedRooms = sortRoomsForDrawingOrder(rooms);
  assert(areRoomsWellOrdered(sortedRooms), 'rooms could not be ordered for drawing');
  
  return errors.errorCount <= originalErrorCount ? sortedRooms : [];
}

export function addRoomsForMapLayoutToLevel(sections:LevelFileSections, loadingContext:LevelLoadingContext, level:MutableLevel, errors:ErrorCollector):boolean {
  const originalErrorCount = errors.errorCount;

  const rooms:Room[] = _createRoomsFromMapSection(sections.map.text, errors);
  _validateMapLegendRoomsAgainstRoomsSection(sections.map.text, sections.rooms.text, errors);
  _applyRoomMetadataFromSections(sections.rooms.text, sections.roomStyles.text, rooms, errors);
  const groundFloorY = findGroundFloorY(rooms, loadingContext.groundFloorRoomRef, errors);
  validateOutsideRoomsAgainstGroundFloor(rooms, loadingContext.groundFloorRoomRef, groundFloorY, errors);
  
  // Assign to level if we didn't have errors. These rooms will still need exits, waypoints, and potentially other data.
  if (!errors.hasErrors) {
    level.groundFloorY = groundFloorY;
    level.rooms = rooms;
  }

  return errors.errorCount <= originalErrorCount;
}
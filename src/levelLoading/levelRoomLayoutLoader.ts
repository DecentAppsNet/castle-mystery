/* This module groups room geometry, room-grid parsing, and room navigation layout initialization during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { MAP_TILE_SIZE } from "../game/roomGridUtil";
import { findImageFilterId } from "../game/imageFilters/imageFilterUtil";
import { getRoomTextureAssetUrl } from "../game/imageUrlUtil";
import { findRoom } from "../game/roomUtil";
import { FLOOR_WAYPOINT_Y_OFFSET } from "../game/waypointUtil";
import { generateStairFlights } from "../game/stairFlightUtil";
import { generateStairParts } from "../game/stairPartUtil";
import { generateWaypoints } from "./waypointGenerationUtil";
import Level from "../game/types/Level";
import Rect from "../game/types/Rect";
import Room from "../game/types/Room";
import Texture from "../game/types/Texture";
import TextureModifier from "../game/types/TextureModifier";
import ExitStatus from "../game/types/ExitStatus";
import ExitType from "../game/types/ExitType";
import RoomExit, { createRoomExitId, LOCKABLE_WITHOUT_INV_CHECK } from "../game/types/RoomExit";
import { MarkdownLineError, parseFirstFencedCodeBlockLines, parseNameValueLineEntriesWithLines, parseOptions, parseSectionEntriesWithLines, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { normalizeId } from "../game/idUtil";
import { tryResolveItemId } from "./levelRoomPopulationLoader";
import { areRoomsWellOrdered, sortRoomsForDrawingOrder } from "./roomOrderingUtil";

export type LegendTile = {
  entryId:string,
  row:number,
  col:number
};

type ParsedExitReference = {
  connectedRoomId:string,
  modifiers:Set<string>,
  lockableWith:string|null
};

type PendingExit = {
  room1Id:string,
  room2Id:string,
  room1Modifiers:Set<string>,
  room2Modifiers:Set<string>,
  room1LockableWith:string|null,
  room2LockableWith:string|null,
  sourceReferences:{ fromRoomId:string, toRoomId:string, lineNo:number }[]
};

const VALID_EXIT_MODIFIERS = new Set(['lockable', 'unlockable', 'closed', 'open', 'locked', 'unlocked']);

function _isIgnoredGridTileChar(tileChar:string):boolean {
  return tileChar === '.' || tileChar === '#' || tileChar === ' ' || tileChar === '\t';
}

function _parseExitModifier(modifierText:string, trimmedExitText:string, itemDefinitions:Map<string, { title:string }>):{ modifier:string, lockableWith:string|null } {
  const trimmedModifierText = modifierText.trim();
  const lowerModifierText = trimmedModifierText.toLowerCase();
  if (!lowerModifierText.startsWith('lockable with ') && !lowerModifierText.startsWith('unlockable with ')) {
    return { modifier:lowerModifierText, lockableWith:null };
  }

  const modifier = lowerModifierText.startsWith('lockable with ') ? 'lockable' : 'unlockable';
  const itemText = trimmedModifierText.slice(`${modifier} with `.length).trim();
  if (!itemText.length) throw new Error(`missing item name in '${trimmedExitText}'`);
  const itemId = tryResolveItemId(itemText, itemDefinitions);
  if (!itemId) throw new Error(`unknown item '${itemText}' in '${trimmedExitText}'`);
  return { modifier, lockableWith:itemId };
}

function _mergeLockableWith(existing:string|null, next:string|null, trimmedExitText:string):string|null {
  if (existing === null) return next;
  if (next === null || existing === next) return existing;
  throw new Error(`conflicting lockable item requirements in '${trimmedExitText}'`);
}

function _createInvalidExitModifierMessage(modifier:string, trimmedExitText:string):string {
  if (modifier.includes('(') || modifier.includes(')')) {
    return `invalid exit modifier '${modifier}' in '${trimmedExitText}': multiple exits must be separated by '|' and commas are only valid inside one exit's modifier list`;
  }
  return `invalid exit modifier '${modifier}' in '${trimmedExitText}'; valid modifiers are lockable, unlockable, closed, open, locked, and unlocked`;
}

function _validateMapSectionIsPresent(mapSection:string) {
  if (mapSection.trim().length > 0) return;
  throw new Error('missing required map section');
}

function _validateMapGridIsPresent(mapLines:string[]) {
  if (mapLines.length > 0) return;
  throw new Error('map section must include a fenced grid');
}

function _findUsedMapLegendChars(gridLines:string[]):Set<string> {
  const usedLegendChars = new Set<string>();
  gridLines.forEach(line => {
    Array.from(line).forEach(tileChar => {
      if (_isIgnoredGridTileChar(tileChar)) return;
      usedLegendChars.add(tileChar);
    });
  });
  return usedLegendChars;
}

function _validateLegendMatchesGrid(legend:Record<string, string>, usedLegendChars:Set<string>) {
  Object.keys(legend).forEach(tileChar => {
    if (tileChar === '.' || usedLegendChars.has(tileChar)) return;
    throw new Error(`map legend tile '${tileChar}' is not used in the map grid`);
  });
}

function _createNormalizedSectionEntryMap(markdownText:string, indentLevel:number, firstLineNo:number):Map<string, { authoredName:string, value:string, lineNo:number }> {
  const normalizedEntries = new Map<string, { authoredName:string, value:string, lineNo:number }>();
  parseSectionEntriesWithLines(markdownText, indentLevel, false, firstLineNo).forEach(sectionEntry => {
    const normalizedName = normalizeId(sectionEntry.name);
    const existingEntry = normalizedEntries.get(normalizedName) || null;
    if (existingEntry) throw new MarkdownLineError(sectionEntry.lineNo,
      `duplicate normalized entry '${sectionEntry.name}' conflicts with '${existingEntry.authoredName}'`);
    normalizedEntries.set(normalizedName, {
      authoredName:sectionEntry.name,
      value:sectionEntry.value,
      lineNo:sectionEntry.lineNo
    });
  });
  return normalizedEntries;
}

function _createNormalizedRoomSectionIds(roomsSection:string, firstLineNo:number):Set<string> {
  return new Set(Array.from(_createNormalizedSectionEntryMap(roomsSection, 2, firstLineNo).keys()));
}

type RoomStyleMetadata = Readonly<{
  backWallTexture:Texture|null,
  floorTexture:Texture|null,
  rightWallTexture:Texture|null
}>;

function _createRoomStyleMetadata(roomStyleSection:string, roomStyleId:string, lineNo:number):RoomStyleMetadata {
  const roomStyleNameValues = parseUniqueNameValueLines(roomStyleSection, `room style ${roomStyleId}`, false, lineNo + 1);
  return {
    backWallTexture:_parseOptionalRoomTexture(roomStyleNameValues.backWallTexture, roomStyleId, 'backWallTexture', 'layers'),
    floorTexture:_parseOptionalRoomTexture(roomStyleNameValues.floorTexture, roomStyleId, 'floorTexture', 'rows'),
    rightWallTexture:_parseOptionalRoomTexture(roomStyleNameValues.rightWallTexture, roomStyleId, 'rightWallTexture', 'layers')
  };
}

function _createRoomStyleMetadataById(roomStylesSection:string, firstLineNo:number):Map<string, RoomStyleMetadata> {
  const roomStyleEntriesById = _createNormalizedSectionEntryMap(roomStylesSection, 2, firstLineNo);
  const roomStyleMetadataById = new Map<string, RoomStyleMetadata>();
  roomStyleEntriesById.forEach((roomStyleEntry, roomStyleId) => {
    roomStyleMetadataById.set(roomStyleId, _createRoomStyleMetadata(roomStyleEntry.value, roomStyleId, roomStyleEntry.lineNo));
  });
  return roomStyleMetadataById;
}

function _findRoomStyleMetadataOrThrow(roomStyleText:string, roomId:string, roomStyleMetadataById:Map<string, RoomStyleMetadata>):RoomStyleMetadata {
  const roomStyleId = normalizeId(roomStyleText);
  const roomStyleMetadata = roomStyleMetadataById.get(roomStyleId) || null;
  if (roomStyleMetadata) return roomStyleMetadata;
  throw new Error(`room ${roomId} references unknown style '${roomStyleText}'`);
}

function _resolveRoomTextureOverride(roomNameValues:Record<string, string>, propertyName:'backWallTexture'|'floorTexture'|'rightWallTexture',
  roomId:string, verticalUnitLabel:'layers'|'rows', inheritedTexture:Texture|null):Texture|null {
  if (!Object.hasOwn(roomNameValues, propertyName)) return inheritedTexture;
  return _parseOptionalRoomTexture(roomNameValues[propertyName], roomId, propertyName, verticalUnitLabel);
}

function _validateMapLegendRoomsExistInRoomsSection(legend:Record<string, string>, roomsSection:string, roomsFirstLineNo:number) {
  const roomSectionIds = _createNormalizedRoomSectionIds(roomsSection, roomsFirstLineNo);
  Object.values(legend).forEach(roomName => {
    const roomId = normalizeId(roomName);
    if (roomSectionIds.has(roomId)) return;
    throw new Error(`map legend room '${roomName}' does not match any room in the rooms section`);
  });
}

function _findLegendEntryTextOrThrow(tileChar:string, legend:Record<string, string>, row:number, col:number, contextLabel:string):string|null {
  if (_isIgnoredGridTileChar(tileChar)) return null;
  const entryText = legend[tileChar];
  if (entryText) return entryText;
  throw new Error(`unknown ${contextLabel} legend tile '${tileChar}' at row ${row + 1}, col ${col + 1}`);
}

function _parsePositiveTextureSpanOrThrow(valueText:string, axisLabel:'horizontal'|'vertical', textureFieldName:string, roomId:string):number {
  const value = Number(valueText.trim());
  if (!Number.isInteger(value) || value <= 0) throw new Error(`room ${roomId} ${axisLabel} in ${textureFieldName} must be a positive integer`);
  return value;
}

function _buildRoomTextureSyntaxDescription(verticalUnitLabel:'layers'|'rows'):string {
  return `'filename.png (columns,${verticalUnitLabel})' or 'filename.png', optionally followed by '| aged stone'`;
}

function _parseRoomTextureBaseSegmentOrThrow(value:string, roomId:string,
  textureFieldName:'backWallTexture'|'floorTexture'|'rightWallTexture', verticalUnitLabel:'layers'|'rows'):
  Pick<Texture, 'imageUrl'|'horizontalCount'|'verticalCount'> {
  const trimmedValue = value.trim();
  const openParenIndex = trimmedValue.lastIndexOf('(');
  const closeParenIndex = trimmedValue.lastIndexOf(')');
  if (openParenIndex < 0 && closeParenIndex < 0) {
    return {
      imageUrl:getRoomTextureAssetUrl(trimmedValue, `room ${textureFieldName}`),
      horizontalCount:4,
      verticalCount:4
    };
  }
  if (openParenIndex <= 0 || closeParenIndex <= openParenIndex) {
    throw new Error(`room ${roomId} ${textureFieldName} must be in the form ${_buildRoomTextureSyntaxDescription(verticalUnitLabel)}`);
  }

  const filename = trimmedValue.slice(0, openParenIndex).trim();
  const countsText = trimmedValue.slice(openParenIndex + 1, closeParenIndex).trim();
  const trailingText = trimmedValue.slice(closeParenIndex + 1).trim();
  if (!filename || !countsText || trailingText) {
    throw new Error(`room ${roomId} ${textureFieldName} must be in the form ${_buildRoomTextureSyntaxDescription(verticalUnitLabel)}`);
  }

  const countParts = countsText.split(',');
  if (countParts.length !== 2) throw new Error(`room ${roomId} ${textureFieldName} must be in the form ${_buildRoomTextureSyntaxDescription(verticalUnitLabel)}`);
  return {
    imageUrl:getRoomTextureAssetUrl(filename, `room ${textureFieldName}`),
    horizontalCount:_parsePositiveTextureSpanOrThrow(countParts[0], 'horizontal', textureFieldName, roomId),
    verticalCount:_parsePositiveTextureSpanOrThrow(countParts[1], 'vertical', textureFieldName, roomId)
  };
}

function _parseRoomTextureModifierOrThrow(value:string, roomId:string,
  textureFieldName:'backWallTexture'|'floorTexture'|'rightWallTexture'):TextureModifier {
  const imageFilterId = findImageFilterId(value);
  if (imageFilterId) return { type:'imageFilter', imageFilterId };
  throw new Error(`room ${roomId} ${textureFieldName} has unknown texture modifier '${value.trim()}'`);
}

function _parseOptionalRoomTexture(value:string|undefined, roomId:string,
  textureFieldName:'backWallTexture'|'floorTexture'|'rightWallTexture', verticalUnitLabel:'layers'|'rows'):Texture|null {
  if (!value?.trim()) return null;
  const segments = value.split('|').map(segment => segment.trim());
  if (segments.some(segment => !segment)) {
    throw new Error(`room ${roomId} ${textureFieldName} must be in the form ${_buildRoomTextureSyntaxDescription(verticalUnitLabel)}`);
  }

  const textureBase = _parseRoomTextureBaseSegmentOrThrow(segments[0], roomId, textureFieldName, verticalUnitLabel);
  return {
    ...textureBase,
    modifiers:segments.slice(1).map(segment => _parseRoomTextureModifierOrThrow(segment, roomId, textureFieldName))
  };
}

export function findLegendTilesInGrid(gridLines:string[], legend:Record<string, string>):LegendTile[] {
  const legendTiles:LegendTile[] = [];
  gridLines.forEach((line, row) => {
    Array.from(line).forEach((tileChar, col) => {
      const entryId = _findLegendEntryTextOrThrow(tileChar, legend, row, col, 'room');
      if (!entryId) return;
      legendTiles.push({ entryId, row, col });
    });
  });
  return legendTiles;
}

export function calcScaledRoomGridPosition(room:Room, row:number, col:number, gridWidth:number, gridHeight:number):[x:number, y:number] {
  const tileWidth = room.rect.width / gridWidth;
  const tileHeight = room.rect.height / gridHeight;
  return [
    room.rect.x + (col + 0.5) * tileWidth,
    room.rect.y + (row + 0.5) * tileHeight
  ];
}

export function createRoomsFromMapSection(level:Level, mapSection:string, firstLineNo:number = 1) {
  _validateMapSectionIsPresent(mapSection);
  const mapLines = parseFirstFencedCodeBlockLines(mapSection);
  _validateMapGridIsPresent(mapLines);
  const legend = parseUniqueNameValueLines(mapSection, 'map legend', false, firstLineNo);
  _validateLegendMatchesGrid(legend, _findUsedMapLegendChars(mapLines));
  const roomBoundsById = new Map<string, { authoredName:string, tileChar:string, minCol:number, maxCol:number, minRow:number, maxRow:number }>();
  const roomTileCountById = new Map<string, number>();

  mapLines.forEach((line, row) => {
    Array.from(line).forEach((tileChar, col) => {
      const authoredRoomName = _findLegendEntryTextOrThrow(tileChar, legend, row, col, 'map');
      if (!authoredRoomName) return;
      const roomId = normalizeId(authoredRoomName);
      const existingBounds = roomBoundsById.get(roomId);
      if (!existingBounds) {
        roomBoundsById.set(roomId, { authoredName:authoredRoomName, tileChar, minCol:col, maxCol:col, minRow:row, maxRow:row });
        roomTileCountById.set(roomId, 1);
        return;
      }
      if (existingBounds.tileChar !== tileChar) throw new Error(`duplicate room id '${authoredRoomName}' conflicts with '${existingBounds.authoredName}' in map legend`);
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
    if (actualTileCount !== expectedTileCount) throw new Error(`map room '${bounds.authoredName}' must be rectangular`);
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
  if (!areRoomsWellOrdered(sortedRooms)) throw new Error('internal error: rooms could not be ordered for drawing');
  level.rooms.push(...sortedRooms);
}

export function validateMapLegendRoomsAgainstRoomsSection(mapSection:string, roomsSection:string, mapFirstLineNo:number = 1, roomsFirstLineNo:number = 1) {
  _validateMapSectionIsPresent(mapSection);
  const mapLines = parseFirstFencedCodeBlockLines(mapSection);
  _validateMapGridIsPresent(mapLines);
  const legend = parseUniqueNameValueLines(mapSection, 'map legend', false, mapFirstLineNo);
  _validateLegendMatchesGrid(legend, _findUsedMapLegendChars(mapLines));
  _validateMapLegendRoomsExistInRoomsSection(legend, roomsSection, roomsFirstLineNo);
}

export function applyRoomMetadataFromSections(level:Level, roomsSection:string, firstLineNo:number = 1,
  roomStylesSection:string = '', roomStylesFirstLineNo:number = 1) {
  const roomSectionsById = _createNormalizedSectionEntryMap(roomsSection, 2, firstLineNo);
  const roomStyleMetadataById = _createRoomStyleMetadataById(roomStylesSection, roomStylesFirstLineNo);
  level.rooms.forEach((room, index) => {
    const roomSectionEntry = roomSectionsById.get(room.id) || null;
    if (!roomSectionEntry) return;
    const roomNameValues = parseUniqueNameValueLines(roomSectionEntry.value, `room ${room.id}`, false, roomSectionEntry.lineNo + 1);
    const inheritedRoomStyle = roomNameValues.style
      ? _findRoomStyleMetadataOrThrow(roomNameValues.style, room.id, roomStyleMetadataById)
      : null;
    const title = Object.hasOwn(roomNameValues, 'title')
      ? roomNameValues.title
      : roomSectionEntry.authoredName.trim();
    level.rooms[index] = {
      ...room,
      title,
      isOutside: (roomNameValues.outside || '').toLowerCase() === 'true',
      backWallTexture:_resolveRoomTextureOverride(roomNameValues, 'backWallTexture', room.id, 'layers', inheritedRoomStyle?.backWallTexture || null),
      floorTexture:_resolveRoomTextureOverride(roomNameValues, 'floorTexture', room.id, 'rows', inheritedRoomStyle?.floorTexture || null),
      rightWallTexture:_resolveRoomTextureOverride(roomNameValues, 'rightWallTexture', room.id, 'layers', inheritedRoomStyle?.rightWallTexture || null),
      isObscured: (roomNameValues.obscured || '').toLowerCase() === 'true'
    };
  });
}

export function validateRoomGridLegendEntries(level:Level, roomsSection:string, knownPopulationEntryIds:Set<string>, firstLineNo:number = 1) {
  const roomSectionsById = _createNormalizedSectionEntryMap(roomsSection, 2, firstLineNo);

  Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
    const roomSection = roomSectionEntry.value;
    const room = findRoom(level.rooms, roomId);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const roomNameValues = parseUniqueNameValueLines(roomSection, `room ${roomId}`, false, roomSectionEntry.lineNo + 1);
    const roomLegend = Object.fromEntries(
      Object.entries(roomNameValues).filter(([name]) => name !== 'exits' && name !== 'obscured' && name !== 'outside' && name !== 'style' && name !== 'backWallTexture' && name !== 'floorTexture' && name !== 'rightWallTexture')
    );

    findLegendTilesInGrid(gridLines, roomLegend).forEach(({ entryId:entryText, row, col }) => {
      parseOptions(entryText).forEach(populationEntryText => {
        if (knownPopulationEntryIds.has(normalizeId(populationEntryText))) return;
        throw new Error(`unknown room legend entry '${populationEntryText}' at row ${row + 1}, col ${col + 1} in room ${room.title}`);
      });
    });
  });
}

function _findSharedWallSectionBetweenRooms(room1:Room, room2:Room):Rect|null {
  function _intersectRange(aStart:number, aEnd:number, bStart:number, bEnd:number): [number, number] | null {
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return end > start ? [start, end] : null;
  }

  if (room1.rect.y === room2.rect.y + room2.rect.height) {
    const overlap = _intersectRange(room1.rect.x, room1.rect.x + room1.rect.width, room2.rect.x, room2.rect.x + room2.rect.width);
    if (!overlap) return null;
    return { x: overlap[0], y: room1.rect.y, width: overlap[1] - overlap[0], height: 0 };
  } else if (room2.rect.y === room1.rect.y + room1.rect.height) {
    const overlap = _intersectRange(room1.rect.x, room1.rect.x + room1.rect.width, room2.rect.x, room2.rect.x + room2.rect.width);
    if (!overlap) return null;
    return { x: overlap[0], y: room2.rect.y, width: overlap[1] - overlap[0], height: 0 };
  } else if (room1.rect.x === room2.rect.x + room2.rect.width) {
    const overlap = _intersectRange(room1.rect.y, room1.rect.y + room1.rect.height, room2.rect.y, room2.rect.y + room2.rect.height);
    if (!overlap) return null;
    return { x: room1.rect.x, y: overlap[0], width: 0, height: overlap[1] - overlap[0] };
  } else if (room2.rect.x === room1.rect.x + room1.rect.width) {
    const overlap = _intersectRange(room1.rect.y, room1.rect.y + room1.rect.height, room2.rect.y, room2.rect.y + room2.rect.height);
    if (!overlap) return null;
    return { x: room2.rect.x, y: overlap[0], width: 0, height: overlap[1] - overlap[0] };
  } else {
    return null;
  }
}

function _findExitPositionFromSharedWallSection(sharedWallSection:Rect):[x:number, y:number] {
  return [sharedWallSection.x, sharedWallSection.y + sharedWallSection.height];
}

function _throwIfSharedWallSectionIsHorizontal(sharedWallSection:Rect, pendingExit:PendingExit):void {
  if (sharedWallSection.width === 0) return;
  throw new Error(`ceiling or floor exits are not supported for ${pendingExit.room1Id}|${pendingExit.room2Id}`);
}

function _parseExitReference(exitText:string, itemDefinitions:Map<string, { title:string }>):ParsedExitReference {
  const trimmedExitText = exitText.trim();
  const openParenIndex = trimmedExitText.indexOf('(');
  if (openParenIndex === -1) return { connectedRoomId:normalizeId(trimmedExitText), modifiers:new Set(), lockableWith:null };

  const closeParenIndex = trimmedExitText.lastIndexOf(')');
  if (closeParenIndex < openParenIndex) throw new Error(`invalid exit modifiers syntax '${trimmedExitText}'`);
  const trailingText = trimmedExitText.slice(closeParenIndex + 1).trim();
  if (trailingText.length > 0) throw new Error(`invalid exit modifiers syntax '${trimmedExitText}'`);

  const connectedRoomText = trimmedExitText.slice(0, openParenIndex).trim();
  const modifiers = new Set<string>();
  let lockableWith:string|null = null;
  parseOptions(trimmedExitText.slice(openParenIndex + 1, closeParenIndex).split(',').join('|')).forEach(modifierText => {
    const parsedModifier = _parseExitModifier(modifierText, trimmedExitText, itemDefinitions);
    modifiers.add(parsedModifier.modifier);
    lockableWith = _mergeLockableWith(lockableWith, parsedModifier.lockableWith,
      trimmedExitText);
  });

  Array.from(modifiers).forEach(modifier => {
    if (!VALID_EXIT_MODIFIERS.has(modifier)) throw new Error(_createInvalidExitModifierMessage(modifier, trimmedExitText));
  });

  if (lockableWith !== null && !modifiers.has('lockable') && !modifiers.has('unlockable')) {
    throw new Error(`invalid exit modifiers syntax '${trimmedExitText}'`);
  }

  return { connectedRoomId:normalizeId(connectedRoomText), modifiers, lockableWith };
}

function _hasAnyModifier(modifiers:Set<string>, candidateModifiers:string[]):boolean {
  return candidateModifiers.some(candidateModifier => modifiers.has(candidateModifier));
}

function _getCombinedExitModifiers(exit:PendingExit):Set<string> {
  return new Set([...Array.from(exit.room1Modifiers), ...Array.from(exit.room2Modifiers)]);
}

function _determineExitType(exit:PendingExit):ExitType {
  const combinedModifiers = _getCombinedExitModifiers(exit);
  if (!combinedModifiers.size) return ExitType.doorway;
  if (_hasAnyModifier(combinedModifiers, ['locked', 'unlocked', 'lockable', 'unlockable'])) return ExitType.lockableDoor;
  return ExitType.door;
}

function _determineExitStatus(exit:PendingExit, exitType:ExitType):ExitStatus {
  const combinedModifiers = _getCombinedExitModifiers(exit);
  if (exitType === ExitType.doorway) return ExitStatus.open;

  if (combinedModifiers.has('locked')) {
    if (_hasAnyModifier(combinedModifiers, ['unlocked', 'open'])) throw new Error(`conflicting exit modifiers for ${exit.room1Id}|${exit.room2Id}: locked`);
    return ExitStatus.locked;
  }
  if (_hasAnyModifier(combinedModifiers, ['unlocked', 'lockable', 'unlockable'])) {
    if (combinedModifiers.has('locked')) throw new Error(`conflicting exit modifiers for ${exit.room1Id}|${exit.room2Id}: unlocked`);
    return ExitStatus.unlocked;
  }
  if (combinedModifiers.has('open')) {
    if (_hasAnyModifier(combinedModifiers, ['locked', 'closed'])) throw new Error(`conflicting exit modifiers for ${exit.room1Id}|${exit.room2Id}: open`);
    return ExitStatus.open;
  }
  return ExitStatus.closed;
}

function _createPendingExits(roomsSection:string, itemDefinitions:Map<string, { title:string }>, firstLineNo:number):PendingExit[] {
  const pendingExitsByPairKey = new Map<string, PendingExit>();
  const roomSectionsById = _createNormalizedSectionEntryMap(roomsSection, 2, firstLineNo);

  Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
    const roomSection = roomSectionEntry.value;
    const nameValues = parseUniqueNameValueLines(roomSection, `room ${roomId}`, false, roomSectionEntry.lineNo + 1);
    const exitsLineNo = parseNameValueLineEntriesWithLines(roomSection, false, roomSectionEntry.lineNo + 1)
      .find(entry => entry.name === 'exits')?.lineNo ?? roomSectionEntry.lineNo;
    parseOptions(nameValues.exits || '').forEach(exitText => {
      let parsedExit:ParsedExitReference;
      try {
        parsedExit = _parseExitReference(exitText, itemDefinitions);
      } catch (error) {
        if (error instanceof MarkdownLineError) throw error;
        throw new MarkdownLineError(exitsLineNo, error instanceof Error ? error.message : String(error));
      }
      const [room1Id, room2Id] = [roomId, parsedExit.connectedRoomId].sort();
      const pairKey = `${room1Id}|${room2Id}`;
      const pendingExit = pendingExitsByPairKey.get(pairKey) || {
        room1Id,
        room2Id,
        room1Modifiers:new Set<string>(),
        room2Modifiers:new Set<string>(),
        room1LockableWith:null,
        room2LockableWith:null,
        sourceReferences:[]
      };
      const isRoom1Side = pendingExit.room1Id === roomId;
      const sideModifiers = isRoom1Side ? pendingExit.room1Modifiers : pendingExit.room2Modifiers;
      parsedExit.modifiers.forEach(modifier => sideModifiers.add(modifier));
      pendingExit.sourceReferences.push({ fromRoomId:roomId, toRoomId:parsedExit.connectedRoomId, lineNo:exitsLineNo });
      if (parsedExit.lockableWith !== null) {
        if (isRoom1Side) pendingExit.room1LockableWith = _mergeLockableWith(pendingExit.room1LockableWith, parsedExit.lockableWith, exitText);
        else pendingExit.room2LockableWith = _mergeLockableWith(pendingExit.room2LockableWith, parsedExit.lockableWith, exitText);
      }
      pendingExitsByPairKey.set(pairKey, pendingExit);
    });
  });

  return Array.from(pendingExitsByPairKey.values());
}

function _addExitBetweenRooms(level:Level, pendingExit:PendingExit) {
  const { room1Id, room2Id } = pendingExit;
  const room1 = findRoom(level.rooms, room1Id);
  const room2 = findRoom(level.rooms, room2Id);
  const sharedWallSection = _findSharedWallSectionBetweenRooms(room1, room2);
  if (sharedWallSection === null) {
    const sourceReference = pendingExit.sourceReferences[0];
    const sourceRoom = findRoom(level.rooms, sourceReference.fromRoomId);
    const exitRoom = findRoom(level.rooms, sourceReference.toRoomId);
    throw new MarkdownLineError(sourceReference.lineNo,
      `${exitRoom.title}, specified as an exit in ${sourceRoom.title}, is not adjacent.`);
  }
  _throwIfSharedWallSectionIsHorizontal(sharedWallSection, pendingExit);
  const [x, sharedY] = _findExitPositionFromSharedWallSection(sharedWallSection);
  const room1FloorY = room1.rect.y + room1.rect.height;
  const room2FloorY = room2.rect.y + room2.rect.height;
  const y = sharedY === room1FloorY || sharedY === room2FloorY
    ? sharedY - FLOOR_WAYPOINT_Y_OFFSET
    : sharedY;
  const exitType = _determineExitType(pendingExit);
  const exit:RoomExit = {
    id:createRoomExitId(room1Id, room2Id, x, y),
    room1Id,
    room2Id,
    x,
    y,
    exitType,
    lockableFromRoom1With: exitType === ExitType.lockableDoor
      ? pendingExit.room1LockableWith ?? (_hasAnyModifier(pendingExit.room1Modifiers, ['lockable', 'unlockable']) ? LOCKABLE_WITHOUT_INV_CHECK : null)
      : null,
    lockableFromRoom2With: exitType === ExitType.lockableDoor
      ? pendingExit.room2LockableWith ?? (_hasAnyModifier(pendingExit.room2Modifiers, ['lockable', 'unlockable']) ? LOCKABLE_WITHOUT_INV_CHECK : null)
      : null,
    exitStatus: _determineExitStatus(pendingExit, exitType)
  };
  room1.exits.push(exit);
  room2.exits.push(exit);
}

export function addRoomExitsFromRoomsSection(level:Level, roomsSection:string, itemDefinitions:Map<string, { title:string }> = new Map(),
  firstLineNo:number = 1) {
  _createPendingExits(roomsSection, itemDefinitions, firstLineNo).forEach(pendingExit => _addExitBetweenRooms(level, pendingExit));
}

export function generateRoomWaypointsForLevel(level:Level) {
  level.rooms.forEach((room, index) => {
    const stairs = generateStairFlights(room);
    const stairParts = generateStairParts(room, stairs);
    level.rooms[index] = {
      ...room,
      stairParts,
      waypoints: generateWaypoints(room.id, room.rect, room.exits, stairs)
    };
  });
}

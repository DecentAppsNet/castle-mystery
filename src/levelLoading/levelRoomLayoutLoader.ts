// Groups room geometry, room-grid parsing, and room navigation layout initialization during level load.

import { assertNonNullable } from "decent-portal";

import { createObstruction } from "../game/obstructionUtil";
import { findRoom, generateWaypoints } from "../game/roomUtil";
import Level from "../game/types/Level";
import Obstruction from "../game/types/Obstruction";
import Rect from "../game/types/Rect";
import Room from "../game/types/Room";
import ExitStatus from "../game/types/ExitStatus";
import ExitType from "../game/types/ExitType";
import RoomExit, { createRoomExitId, LOCKABLE_WITHOUT_INV_CHECK } from "../game/types/RoomExit";
import { parseFirstFencedCodeBlockLines, parseOptions, parseSections, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { createNormalizedEntryMap, normalizeId } from "../game/idUtil";
import { tryResolveItemId } from "./levelRoomPopulationLoader";

const MAP_TILE_SIZE = 20;

type ObstructionTile = {
  row:number,
  col:number
};

export type LegendTile = {
  entryId:string,
  row:number,
  col:number
};

type MarkerTile = {
  markerId:string,
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
  room2LockableWith:string|null
};

const VALID_EXIT_MODIFIERS = new Set(['lockable', 'unlockable', 'closed', 'open', 'locked', 'unlocked']);

function _isIgnoredGridTileChar(tileChar:string):boolean {
  return tileChar === '.' || tileChar === '#' || tileChar === ' ' || tileChar === '\t';
}

function _parseNameValueLinesOrThrowDuplicate(markdownText:string, contextLabel:string):Record<string, string> {
  return parseUniqueNameValueLines(markdownText, contextLabel);
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

function _createNormalizedRoomSectionIds(roomsSection:string):Set<string> {
  return new Set(Object.keys(parseSections(roomsSection, 2)).map(normalizeId));
}

function _validateMapLegendRoomsExistInRoomsSection(legend:Record<string, string>, roomsSection:string) {
  const roomSectionIds = _createNormalizedRoomSectionIds(roomsSection);
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

function _findObstructionTilesInGrid(gridLines:string[]):ObstructionTile[][] {
  if (!gridLines.length) return [];
  const rowCount = gridLines.length;
  const visited = new Set<string>();
  const obstructionGroups:ObstructionTile[][] = [];

  const _isObstructionTile = (row:number, col:number) => {
    const line = gridLines[row];
    return !!line && line[col] === '#';
  };

  for (let row = 0; row < rowCount; ++row) {
    for (let col = 0; col < gridLines[row].length; ++col) {
      const key = `${row},${col}`;
      if (visited.has(key) || !_isObstructionTile(row, col)) continue;

      const pending:[[number, number]]|Array<[number, number]> = [[row, col]];
      const obstructionTiles:ObstructionTile[] = [];
      visited.add(key);
      while (pending.length > 0) {
        const [currentRow, currentCol] = pending.pop()!;
        obstructionTiles.push({ row:currentRow, col:currentCol });

        const neighbors:Array<[number, number]> = [
          [currentRow - 1, currentCol],
          [currentRow + 1, currentCol],
          [currentRow, currentCol - 1],
          [currentRow, currentCol + 1]
        ];
        neighbors.forEach(([neighborRow, neighborCol]) => {
          if (neighborRow < 0 || neighborRow >= rowCount || neighborCol < 0) return;
          const neighborKey = `${neighborRow},${neighborCol}`;
          if (visited.has(neighborKey) || !_isObstructionTile(neighborRow, neighborCol)) return;
          visited.add(neighborKey);
          pending.push([neighborRow, neighborCol]);
        });
      }

      obstructionGroups.push(obstructionTiles);
    }
  }

  return obstructionGroups;
}

function _createNormalizedObstructionFromTiles(room:Room, obstructionTiles:ObstructionTile[], gridWidth:number, gridHeight:number):Obstruction {
  const tileWidth = room.rect.width / gridWidth;
  const tileHeight = room.rect.height / gridHeight;
  const rowRuns = new Map<number, Array<[number, number]>>();

  obstructionTiles.forEach(tile => {
    const runs = rowRuns.get(tile.row) || [];
    runs.push([tile.col, tile.col]);
    rowRuns.set(tile.row, runs);
  });

  const rects:Rect[] = [];
  Array.from(rowRuns.entries()).sort((a, b) => a[0] - b[0]).forEach(([row, runs]) => {
    runs.sort((a, b) => a[0] - b[0]);
    let [currentStart, currentEnd] = runs[0];
    for (let i = 1; i < runs.length; ++i) {
      const [start, end] = runs[i];
      if (start <= currentEnd + 1) currentEnd = Math.max(currentEnd, end);
      else {
        rects.push({
          x: room.rect.x + currentStart * tileWidth,
          y: room.rect.y + row * tileHeight,
          width: (currentEnd - currentStart + 1) * tileWidth,
          height: tileHeight
        });
        currentStart = start;
        currentEnd = end;
      }
    }
    rects.push({
      x: room.rect.x + currentStart * tileWidth,
      y: room.rect.y + row * tileHeight,
      width: (currentEnd - currentStart + 1) * tileWidth,
      height: tileHeight
    });
  });

  return createObstruction(rects);
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

function _findMarkerTilesInGrid(gridLines:string[], legend:Record<string, string>, excludedEntryIds:Set<string>):MarkerTile[] {
  return findLegendTilesInGrid(gridLines, legend)
    .filter(({ entryId:entryText }) => !excludedEntryIds.has(normalizeId(entryText)))
    .map(({ entryId:entryText, row, col }) => ({ markerId:normalizeId(entryText), row, col }));
}

export function calcScaledRoomGridPosition(room:Room, row:number, col:number, gridWidth:number, gridHeight:number):[x:number, y:number] {
  const tileWidth = room.rect.width / gridWidth;
  const tileHeight = room.rect.height / gridHeight;
  return [
    Math.round(room.rect.x + (col + 0.5) * tileWidth),
    Math.round(room.rect.y + (row + 0.5) * tileHeight)
  ];
}

function _addRoomObstructionsFromRoomsSection(level:Level, roomsSection:string) {
  const roomSections = parseSections(roomsSection, 2);

  Object.entries(roomSections).forEach(([roomName, roomSection]) => {
    const roomId = normalizeId(roomName);
    const room = findRoom(level.rooms, roomId);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
    const gridHeight = gridLines.length;
    if (gridWidth <= 0 || gridHeight <= 0) return;

    _findObstructionTilesInGrid(gridLines).forEach(obstructionTiles => {
      room.obstructions.push(_createNormalizedObstructionFromTiles(room, obstructionTiles, gridWidth, gridHeight));
    });
  });
}

export function createRoomsFromMapSection(level:Level, mapSection:string) {
  _validateMapSectionIsPresent(mapSection);
  const mapLines = parseFirstFencedCodeBlockLines(mapSection);
  _validateMapGridIsPresent(mapLines);
  const legend = _parseNameValueLinesOrThrowDuplicate(mapSection, 'map legend');
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

  Array.from(roomBoundsById.entries()).forEach(([roomId, bounds]) => {
    const expectedTileCount = (bounds.maxCol - bounds.minCol + 1) * (bounds.maxRow - bounds.minRow + 1);
    const actualTileCount = roomTileCountById.get(roomId) || 0;
    if (actualTileCount !== expectedTileCount) throw new Error(`map room '${bounds.authoredName}' must be rectangular`);
    level.rooms.push({
      id: roomId,
      title: bounds.authoredName.trim(),
      rect: {
        x: bounds.minCol * MAP_TILE_SIZE,
        y: bounds.minRow * MAP_TILE_SIZE,
        width: (bounds.maxCol - bounds.minCol + 1) * MAP_TILE_SIZE,
        height: (bounds.maxRow - bounds.minRow + 1) * MAP_TILE_SIZE
      },
      isObscured: false,
      items: [],
      obstructions: [],
      waypoints: [],
      positionMarkersById: {},
      exits: [],
      isDiscovered: false
    });
  });
}

export function validateMapLegendRoomsAgainstRoomsSection(mapSection:string, roomsSection:string) {
  _validateMapSectionIsPresent(mapSection);
  const mapLines = parseFirstFencedCodeBlockLines(mapSection);
  _validateMapGridIsPresent(mapLines);
  const legend = _parseNameValueLinesOrThrowDuplicate(mapSection, 'map legend');
  _validateLegendMatchesGrid(legend, _findUsedMapLegendChars(mapLines));
  _validateMapLegendRoomsExistInRoomsSection(legend, roomsSection);
}

export function applyRoomMetadataFromSections(level:Level, roomsSection:string) {
  const roomSectionsById = createNormalizedEntryMap(Object.entries(parseSections(roomsSection, 2)));
  level.rooms.forEach((room, index) => {
    const roomSectionEntry = roomSectionsById.get(room.id) || null;
    if (!roomSectionEntry) return;
    const roomNameValues = _parseNameValueLinesOrThrowDuplicate(roomSectionEntry.value, `room ${room.id}`);
    level.rooms[index] = {
      ...room,
      title: roomNameValues.title || roomSectionEntry.authoredName.trim(),
      isObscured: (roomNameValues.obscured || '').toLowerCase() === 'true'
    };
  });

  _addRoomObstructionsFromRoomsSection(level, roomsSection);
}

export function addRoomPositionMarkersFromSections(level:Level, roomsSection:string, excludedEntryIds:Set<string>) {
  const roomSectionsById = createNormalizedEntryMap(Object.entries(parseSections(roomsSection, 2)));

  Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
    const roomSection = roomSectionEntry.value;
    const room = findRoom(level.rooms, roomId);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
    const gridHeight = gridLines.length;
    const roomNameValues = _parseNameValueLinesOrThrowDuplicate(roomSection, `room ${roomId}`);
    const roomLegend = Object.fromEntries(
      Object.entries(roomNameValues).filter(([name]) => name !== 'exits' && name !== 'obscured')
    );

    _findMarkerTilesInGrid(gridLines, roomLegend, excludedEntryIds).forEach(({ markerId, row, col }) => {
      if (room.positionMarkersById[markerId]) throw new Error(`duplicate position marker ${roomId}.${markerId}`);
      const [x, y] = calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
      room.positionMarkersById[markerId] = { x, y };
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
  return sharedWallSection.height === 0
    ? [Math.round(sharedWallSection.x + sharedWallSection.width / 2), sharedWallSection.y]
    : [sharedWallSection.x, Math.round(sharedWallSection.y + sharedWallSection.height / 2)];
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
    if (!VALID_EXIT_MODIFIERS.has(modifier)) throw new Error(`invalid exit modifier '${modifier}' in '${trimmedExitText}'`);
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

function _createPendingExits(roomsSection:string, itemDefinitions:Map<string, { title:string }>):PendingExit[] {
  const pendingExitsByPairKey = new Map<string, PendingExit>();
  const roomSectionsById = createNormalizedEntryMap(Object.entries(parseSections(roomsSection, 2)));

  Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
    const roomSection = roomSectionEntry.value;
    const nameValues = _parseNameValueLinesOrThrowDuplicate(roomSection, `room ${roomId}`);
    parseOptions(nameValues.exits || '').forEach(exitText => {
      const parsedExit = _parseExitReference(exitText, itemDefinitions);
      const [room1Id, room2Id] = [roomId, parsedExit.connectedRoomId].sort();
      const pairKey = `${room1Id}|${room2Id}`;
      const pendingExit = pendingExitsByPairKey.get(pairKey) || {
        room1Id,
        room2Id,
        room1Modifiers:new Set<string>(),
        room2Modifiers:new Set<string>(),
        room1LockableWith:null,
        room2LockableWith:null
      };
      const isRoom1Side = pendingExit.room1Id === roomId;
      const sideModifiers = isRoom1Side ? pendingExit.room1Modifiers : pendingExit.room2Modifiers;
      parsedExit.modifiers.forEach(modifier => sideModifiers.add(modifier));
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
  assertNonNullable(sharedWallSection, 'rooms must be adjacent');
  const [x, y] = _findExitPositionFromSharedWallSection(sharedWallSection);
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

export function addRoomExitsFromRoomsSection(level:Level, roomsSection:string, itemDefinitions:Map<string, { title:string }> = new Map()) {
  _createPendingExits(roomsSection, itemDefinitions).forEach(pendingExit => _addExitBetweenRooms(level, pendingExit));
}

export function generateRoomWaypointsForLevel(level:Level) {
  level.rooms.forEach((room, index) => {
    level.rooms[index] = {
      ...room,
      waypoints: generateWaypoints(room.id, room.rect, room.exits, room.obstructions)
    };
  });
}

// Groups room geometry, room-grid parsing, and room navigation layout initialization during level load.

import { assertNonNullable } from "decent-portal";

import { createObstruction } from "./obstructionUtil";
import { findRoom, generateWaypoints } from "./roomUtil";
import Level from "./types/Level";
import Obstruction from "./types/Obstruction";
import Rect from "./types/Rect";
import Room from "./types/Room";
import { parseFirstFencedCodeBlockLines, parseNameValueLines, parseOptions, parseSections } from "@/common/markdownUtil";

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
      if (tileChar === '.' || tileChar === '#') return;
      const entryId = legend[tileChar];
      if (!entryId) return;
      legendTiles.push({ entryId, row, col });
    });
  });
  return legendTiles;
}

function _findMarkerTilesInGrid(gridLines:string[], legend:Record<string, string>, excludedEntryIds:Set<string>):MarkerTile[] {
  return findLegendTilesInGrid(gridLines, legend)
    .filter(({ entryId }) => !excludedEntryIds.has(entryId))
    .map(({ entryId, row, col }) => ({ markerId:entryId, row, col }));
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

  Object.entries(roomSections).forEach(([roomId, roomSection]) => {
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

export function createRoomsFromMapSection(level:Level, mapSection:string, roomsSection:string = "") {
  const mapLines = parseFirstFencedCodeBlockLines(mapSection);
  const legend = parseNameValueLines(mapSection);
  const roomSections = parseSections(roomsSection, 2);
  const roomBoundsById = new Map<string, { minCol:number, maxCol:number, minRow:number, maxRow:number }>();

  mapLines.forEach((line, row) => {
    Array.from(line).forEach((tileChar, col) => {
      const roomId = legend[tileChar];
      if (!roomId) return;
      const existingBounds = roomBoundsById.get(roomId);
      if (!existingBounds) {
        roomBoundsById.set(roomId, { minCol:col, maxCol:col, minRow:row, maxRow:row });
        return;
      }
      existingBounds.minCol = Math.min(existingBounds.minCol, col);
      existingBounds.maxCol = Math.max(existingBounds.maxCol, col);
      existingBounds.minRow = Math.min(existingBounds.minRow, row);
      existingBounds.maxRow = Math.max(existingBounds.maxRow, row);
    });
  });

  Array.from(roomBoundsById.entries()).forEach(([roomId, bounds]) => {
    const roomNameValues = parseNameValueLines(roomSections[roomId] || "");
    level.rooms.push({
      id: roomId,
      title: roomNameValues.title || roomId,
      rect: {
        x: bounds.minCol * MAP_TILE_SIZE,
        y: bounds.minRow * MAP_TILE_SIZE,
        width: (bounds.maxCol - bounds.minCol + 1) * MAP_TILE_SIZE,
        height: (bounds.maxRow - bounds.minRow + 1) * MAP_TILE_SIZE
      },
      isObscured: (roomNameValues.obscured || '').toLowerCase() === 'true',
      items: [],
      obstructions: [],
      waypoints: [],
      positionMarkersById: {},
      exits: [],
      isDiscovered: false
    });
  });

  _addRoomObstructionsFromRoomsSection(level, roomsSection);
}

export function addRoomPositionMarkersFromSections(level:Level, roomsSection:string, excludedEntryIds:Set<string>) {
  const roomSections = parseSections(roomsSection, 2);

  Object.entries(roomSections).forEach(([roomId, roomSection]) => {
    const room = findRoom(level.rooms, roomId);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
    const gridHeight = gridLines.length;
    const roomNameValues = parseNameValueLines(roomSection);
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

function _addExitBetweenRooms(level:Level, room1Id:string, room2Id:string) {
  const room1 = findRoom(level.rooms, room1Id);
  const room2 = findRoom(level.rooms, room2Id);
  const sharedWallSection = _findSharedWallSectionBetweenRooms(room1, room2);
  assertNonNullable(sharedWallSection, 'rooms must be adjacent');
  const [x, y] = _findExitPositionFromSharedWallSection(sharedWallSection);
  const exit = { room1Id, room2Id, x, y };
  room1.exits.push(exit);
  room2.exits.push(exit);
}

export function addRoomExitsFromRoomsSection(level:Level, roomsSection:string) {
  const roomSections = parseSections(roomsSection, 2);
  const addedExitPairs = new Set<string>();

  Object.entries(roomSections).forEach(([roomId, roomSection]) => {
    const nameValues = parseNameValueLines(roomSection);
    parseOptions(nameValues.exits || "").forEach(connectedRoomId => {
      const exitPairKey = [roomId, connectedRoomId].sort().join("|");
      if (addedExitPairs.has(exitPairKey)) return;
      _addExitBetweenRooms(level, roomId, connectedRoomId);
      addedExitPairs.add(exitPairKey);
    });
  });
}

export function generateRoomWaypointsForLevel(level:Level) {
  level.rooms.forEach((room, index) => {
    level.rooms[index] = {
      ...room,
      waypoints: generateWaypoints(room.id, room.rect, room.exits, room.obstructions)
    };
  });
}

import { assertNonNullable } from "decent-portal";
import Level from "./types/Level";
import Item, { duplicateItem } from "./types/Item";
import Obstruction from "./types/Obstruction";
import Room from "./types/Room";
import Rect from "./types/Rect";
import Character from './types/Character';
import Position from "./types/Position";
import { findNearestWaypoint, findRoom, generateWaypoints } from "./roomUtil";
import { createItineraryIndex, findCharacterPose } from "./itineraryUtil";
import TimeLabel from "./types/TimeLabel";
import { MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import { createObstruction, isPositionInRoomObstruction } from "./obstructionUtil";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import { parseFirstFencedCodeBlockLines, parseNameValueLines, parseOptions, parseSections } from "@/common/markdownUtil";
import { LeadingTimestampKind, parseLeadingTimestamp, parseTimestampToMsecs } from "@/common/timestampUtil";
import { tryCreateAtActivity } from "./activities/atActivityUtil";
import { tryCreateSayActivity } from "./activities/sayActivityUtil";
import { tryCreateWanderActivity } from "./activities/wanderActivityUtil";
import { tryCreateTakeActivity } from "./activities/takeActivityUtil";
import { tryCreateFaceActivity } from "./activities/faceActivityUtil";
import LoadLevelException from "./LoadLevelException";
import {
  appendEventsToCharacterState,
  ActivityContext,
  createCharacterActivityState,
  createInitialRoomItemsByRoomId,
  duplicateCharacterActivityState,
  duplicateRoomItemsByRoomId,
  findStatePoseAtTime
} from "./activities/activityUtil";

const MAP_TILE_SIZE = 20;

type CharacterDefinition = {
  description:string,
  itemIds:string[]
};

type ItemDefinition = {
  title:string,
  description:string,
  displayChar:string
};

type ParsedItineraryActivity = {
  sourceIndex:number,
  time:number|null,
  resolvedTime:number,
  isTimeResolved:boolean,
  timestampKind:LeadingTimestampKind,
  lineNo:number,
  characterId:string,
  activityText:string
};

function _throwErrorWithLoadLevelContext(levelFilename:string, errorLineNo:number, error:unknown):never {
  if (error instanceof LoadLevelException) throw error;
  if (error instanceof Error) throw new LoadLevelException(levelFilename, errorLineNo, error.message, error);
  throw new LoadLevelException(levelFilename, errorLineNo, String(error), error);
}

function _runWithItineraryLineContext<T>(levelFilename:string, errorLineNo:number, callback:() => T):T {
  try {
    return callback();
  } catch (error) {
    _throwErrorWithLoadLevelContext(levelFilename, errorLineNo, error);
  }
}

function _createEmptyLevel(duration:number = MSECS_IN_DAY):Level {
  return {
    rooms: [],
    characters: [],
    activeCharacterId: "",
    startTime: 0,
    duration,
    labels: _createTimeLabels(duration)
  };
}

type ObstructionTile = {
  row:number,
  col:number
};

type CharacterTile = {
  entryId:string,
  row:number,
  col:number
};

type MarkerTile = {
  markerId:string,
  row:number,
  col:number
};

function _parseTimeTextToMsecs(text:string):number {
  return parseTimestampToMsecs(text);
}

function _parseGeneralSection(generalSection:string):{ activeCharacterId:string, startTime:number|null } {
  const generalNameValues = parseNameValueLines(generalSection);
  return {
    activeCharacterId: generalNameValues.activeCharacter || "",
    startTime: generalNameValues.time ? _parseTimeTextToMsecs(generalNameValues.time) : null
  };
}

function _parseCharacterDefinitions(charactersSection:string):Map<string, CharacterDefinition> {
  const characterDefinitions = new Map<string, CharacterDefinition>();
  const characterSections = parseSections(charactersSection, 2);
  Object.entries(characterSections).forEach(([characterId, characterSection]) => {
    const nameValues = parseNameValueLines(characterSection);
    characterDefinitions.set(characterId, {
      description:nameValues.description || "",
      itemIds:parseOptions(nameValues.items || "")
    });
  });
  return characterDefinitions;
}

function _parseItemDefinitions(itemsSection:string):Map<string, ItemDefinition> {
  const itemDefinitions = new Map<string, ItemDefinition>();
  const itemSections = parseSections(itemsSection, 2);
  Object.entries(itemSections).forEach(([itemId, itemSection]) => {
    const nameValues = parseNameValueLines(itemSection);
    itemDefinitions.set(itemId, {
      title:nameValues.title || itemId,
      description:nameValues.description || "",
      displayChar:nameValues.displayChar || itemId.charAt(0) || "?"
    });
  });
  return itemDefinitions;
}

function _createItemFromDefinition(itemId:string, itemDefinitions:Map<string, ItemDefinition>, position:{x:number, y:number}, isDiscovered:boolean):Item {
  const itemDefinition = itemDefinitions.get(itemId);
  return {
    id:itemId,
    title:itemDefinition?.title || itemId,
    displayChar:itemDefinition?.displayChar || itemId.charAt(0) || "?",
    position:{ ...position },
    description:itemDefinition?.description || "",
    isDiscovered
  };
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

function _findLegendTilesInGrid(gridLines:string[], legend:Record<string, string>):CharacterTile[] {
  const characterTiles:CharacterTile[] = [];
  gridLines.forEach((line, row) => {
    Array.from(line).forEach((tileChar, col) => {
      if (tileChar === '.' || tileChar === '#') return;
      const entryId = legend[tileChar];
      if (!entryId) return;
      characterTiles.push({ entryId, row, col });
    });
  });
  return characterTiles;
}

function _findMarkerTilesInGrid(gridLines:string[], legend:Record<string, string>,
  characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>):MarkerTile[] {
  return _findLegendTilesInGrid(gridLines, legend)
    .filter(({ entryId }) => !characterDefinitions.has(entryId) && !itemDefinitions.has(entryId))
    .map(({ entryId, row, col }) => ({ markerId:entryId, row, col }));
}

function _calcScaledRoomGridPosition(room:Room, row:number, col:number, gridWidth:number, gridHeight:number):[x:number, y:number] {
  const tileWidth = room.rect.width / gridWidth;
  const tileHeight = room.rect.height / gridHeight;
  return [
    Math.round(room.rect.x + (col + 0.5) * tileWidth),
    Math.round(room.rect.y + (row + 0.5) * tileHeight)
  ];
}

function _findNearestUnclaimedWaypoint(room:Room, targetX:number, targetY:number, claimedWaypoints:Set<string>) {
  return findNearestWaypoint(room, targetX, targetY, waypoint => !claimedWaypoints.has(`${waypoint.position.x},${waypoint.position.y}`));
}

function _addCharacter(level:Level, room:Room, characterId:string, description:string, x:number, y:number) {
  const claimedWaypoints = new Set(level.characters.map(character => `${character.waypoint.position.x},${character.waypoint.position.y}`));
  const waypoint = _findNearestUnclaimedWaypoint(room, x, y, claimedWaypoints);
  const character:Character = {
    id: characterId,
    description,
    items: [],
    x:waypoint.position.x,
    y:waypoint.position.y,
    waypoint,
    facingAngle:0,
    itinerary:[],
    itineraryIndex:{ eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
  };
  level.characters.push(character);
}

function _addCharactersAndRoomItemsFromSections(level:Level, roomsSection:string,
  characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
  const roomSections = parseSections(roomsSection, 2);

  Object.entries(roomSections).forEach(([roomId, roomSection]) => {
    const room = findRoom(level.rooms, roomId);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
    const gridHeight = gridLines.length;
    const roomNameValues = parseNameValueLines(roomSection);
    const roomLegend = Object.fromEntries(
      Object.entries(roomNameValues).filter(([name]) => name !== 'exits')
    );

    _findLegendTilesInGrid(gridLines, roomLegend).forEach(({ entryId, row, col }) => {
      const [x, y] = _calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
      const characterDefinition = characterDefinitions.get(entryId);
      if (characterDefinition) {
        _addCharacter(level, room, entryId, characterDefinition.description, x, y);
        return;
      }
      if (itemDefinitions.has(entryId)) {
        _addItemToRoom(level, roomId, _createItemFromDefinition(entryId, itemDefinitions, { x, y }, false));
      }
    });
  });
}

function _addRoomPositionMarkersFromSections(level:Level, roomsSection:string,
  characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
  const roomSections = parseSections(roomsSection, 2);

  Object.entries(roomSections).forEach(([roomId, roomSection]) => {
    const room = findRoom(level.rooms, roomId);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
    const gridHeight = gridLines.length;
    const roomNameValues = parseNameValueLines(roomSection);
    const roomLegend = Object.fromEntries(
      Object.entries(roomNameValues).filter(([name]) => name !== 'exits')
    );

    _findMarkerTilesInGrid(gridLines, roomLegend, characterDefinitions, itemDefinitions).forEach(({ markerId, row, col }) => {
      if (room.positionMarkersById[markerId]) throw new Error(`duplicate position marker ${roomId}.${markerId}`);
      const [x, y] = _calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
      room.positionMarkersById[markerId] = { x, y };
    });
  });
}

function _addInventoryItemsToCharacters(level:Level, characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
  level.characters.forEach(character => {
    const characterDefinition = characterDefinitions.get(character.id);
    if (!characterDefinition) return;
    _addItemsToCharacter(level, character.id, characterDefinition.itemIds.map(itemId =>
      _createItemFromDefinition(itemId, itemDefinitions, { x:0, y:0 }, true)
    ));
  });
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

function _createRoomsFromMapSection(level:Level, mapSection:string, roomsSection:string = "") {
  const mapLines = parseFirstFencedCodeBlockLines(mapSection);
  const legend = parseNameValueLines(mapSection);
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
    level.rooms.push({
      id: roomId,
      title: roomId,
      rect: {
        x: bounds.minCol * MAP_TILE_SIZE,
        y: bounds.minRow * MAP_TILE_SIZE,
        width: (bounds.maxCol - bounds.minCol + 1) * MAP_TILE_SIZE,
        height: (bounds.maxRow - bounds.minRow + 1) * MAP_TILE_SIZE
      },
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

function _addRoomExitsFromRoomsSection(level:Level, roomsSection:string) {
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

function _generateRoomWaypoints(level:Level) {
  level.rooms.forEach((room, index) => {
    level.rooms[index] = {
      ...room,
      waypoints: generateWaypoints(room.id, room.rect, room.exits, room.obstructions)
    };
  });
}

function _findSharedWallSectionBetweenRooms(room1:Room, room2:Room):Rect|null {
  // Helper to compute 1D intersection of two ranges. Returns [start,end] or null.
  function _intersectRange(aStart:number, aEnd:number, bStart:number, bEnd:number): [number, number] | null {
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return end > start ? [start, end] : null;
  }

  if (room1.rect.y === room2.rect.y + room2.rect.height) { // Room 2's south wall is parallel with north wall of room 1
    const overlap = _intersectRange(room1.rect.x, room1.rect.x + room1.rect.width, room2.rect.x, room2.rect.x + room2.rect.width);
    if (!overlap) return null;
    return { x: overlap[0], y: room1.rect.y, width: overlap[1] - overlap[0], height: 0 };
  } else if (room2.rect.y === room1.rect.y + room1.rect.height) { // Room 2's north wall is parallel with south wall of room 1
    const overlap = _intersectRange(room1.rect.x, room1.rect.x + room1.rect.width, room2.rect.x, room2.rect.x + room2.rect.width);
    if (!overlap) return null;
    return { x: overlap[0], y: room2.rect.y, width: overlap[1] - overlap[0], height: 0 };
  } else if (room1.rect.x === room2.rect.x + room2.rect.width) { // Room 2's east wall is parallel with west wall of room 1
    const overlap = _intersectRange(room1.rect.y, room1.rect.y + room1.rect.height, room2.rect.y, room2.rect.y + room2.rect.height);
    if (!overlap) return null;
    return { x: room1.rect.x, y: overlap[0], width: 0, height: overlap[1] - overlap[0] };
  } else if (room2.rect.x === room1.rect.x + room1.rect.width) { // Room 2's west wall is parallel with east wall of room 1
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
  const [x,y] = _findExitPositionFromSharedWallSection(sharedWallSection);
  const exit = { room1Id, room2Id, x, y }
  room1.exits.push(exit);
  room2.exits.push(exit);
}

function _formatMinutesAsTimeLabel(minutes:number):string {
  const wholeMinutes = Math.round(minutes);
  const hours24 = Math.floor(wholeMinutes / 60);
  const mins = wholeMinutes % 60;
  if (hours24 === 0 && mins === 0) return "midnight";
  if (hours24 === 12 && mins === 0) return "noon";
  const suffix = hours24 < 12 || hours24 === 24 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  if (mins === 0) return `${hours12}${suffix}`;
  return `${hours12}:${mins.toString().padStart(2, '0')}${suffix}`;
}

function _createTimeLabels(duration:number):TimeLabel[] {
  const durationMinutes = duration / MSECS_IN_MINUTE;
  return [0, .25, .5, .75, 1].map(ratio => {
    const minutes = durationMinutes * ratio;
    return { minutes, label:_formatMinutesAsTimeLabel(minutes) };
  });
}

function _addItemToRoom(level:Level, roomId:string, item:Omit<Item, 'isDiscovered'>) {
  const room = findRoom(level.rooms, roomId);
  assertNonNullable(room);
  const { x, y } = item.position;
  const isInsideRoom = x >= room.rect.x && x <= room.rect.x + room.rect.width
    && y >= room.rect.y && y <= room.rect.y + room.rect.height;
  if (!isInsideRoom) throw new Error(`item ${item.id} is outside room ${roomId}`);
  if (isPositionInRoomObstruction(room, x, y)) throw new Error(`item ${item.id} is inside an obstruction in room ${roomId}`);
  room.items.push({ ...item, isDiscovered:false });
}

function _addItemsToCharacter(level:Level, characterId:string, items:Item[]) {
  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character, `character ${characterId} not found`);
  character.items.push(...items.map(item => ({ ...item, position:{ ...item.position } })));
}

function _parseCharacterActivityLine(activityLine:string):{ characterId:string, activityText:string } {
  const activityMarkers = [' @', ' says ', ' wanders', ' takes ', ' faces '];
  let splitIndex = -1;

  activityMarkers.forEach(marker => {
    const markerIndex = activityLine.indexOf(marker);
    if (markerIndex <= 0) return;
    if (splitIndex === -1 || markerIndex < splitIndex) splitIndex = markerIndex;
  });

  if (splitIndex === -1) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  const characterId = activityLine.slice(0, splitIndex).trim();
  const activityText = activityLine.slice(splitIndex + 1).trim();
  if (!characterId || !activityText) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  return { characterId, activityText };
}

function _parseItineraryActivities(itinerarySection:string, levelFilename:string, firstLineNo:number):ParsedItineraryActivity[] {
  return itinerarySection.split('\n').map((line, index) => ({ line, lineNo:firstLineNo + index }))
    .flatMap(({ line, lineNo }) => {
      return _runWithItineraryLineContext(levelFilename, lineNo, () => {
        const timestamp = parseLeadingTimestamp(line);
        if (!timestamp) return [];
        const activityLine = timestamp.remainingText.trim();
        if (!activityLine.length) throw new Error(`missing itinerary activity`);
        const { characterId, activityText } = _parseCharacterActivityLine(activityLine);
        return [{
          sourceIndex:-1,
          time:timestamp.time,
          resolvedTime:timestamp.time ?? 0,
          isTimeResolved:timestamp.kind === 'absolute',
          timestampKind:timestamp.kind,
          lineNo,
          characterId,
          activityText
        }];
      });
    })
    .map((activity, sourceIndex) => ({ ...activity, sourceIndex }));
}

function _resolveItineraryActivityTimes(activities:ParsedItineraryActivity[], completionTimesBySourceIndex?:Map<number, number>):ParsedItineraryActivity[] {
  const resolvedActivities:ParsedItineraryActivity[] = [];

  activities.forEach((activity, index) => {
    const isTimeResolved = activity.timestampKind === 'absolute'
      ? true
      : index === 0
        ? true
        : completionTimesBySourceIndex?.has(index - 1) ?? false;
    const resolvedTime = activity.timestampKind === 'absolute'
      ? (activity.time ?? 0)
      : index === 0
        ? 0
        : completionTimesBySourceIndex?.get(index - 1) ?? resolvedActivities[index - 1].resolvedTime;
    resolvedActivities.push({ ...activity, resolvedTime, isTimeResolved });
  });

  return resolvedActivities;
}

function _sortActivitiesByResolvedTime(activities:ParsedItineraryActivity[]):ParsedItineraryActivity[] {
  return [...activities]
    .sort((a, b) => a.resolvedTime - b.resolvedTime || a.characterId.localeCompare(b.characterId) || a.lineNo - b.lineNo);
}

function _findSectionFirstContentLineNo(markdownText:string, sectionName:string, indentLevel:number = 1):number|null {
  const lines = markdownText.split('\n');
  const headingText = `${'#'.repeat(indentLevel)} ${sectionName}`;
  const nextHeadingPrefix = '#'.repeat(indentLevel) + ' ';
  const headingIndex = lines.findIndex(line => line.trim() === headingText);
  if (headingIndex === -1) return null;

  for (let i = headingIndex + 1; i < lines.length; ++i) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith(nextHeadingPrefix)) return null;
    if (trimmedLine.length > 0) return i + 1;
  }

  return null;
}

function _createActivityContext(level:Level, character:Character, timestamp:number, timestampKind:LeadingTimestampKind,
  activitySourceIndex:number, roomItemsByRoomId:Map<string, Item[]>, charactersById:Map<string, Character>,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>, poseOverridesByCharacterId:Map<string, Position>):ActivityContext {
  const state = characterStatesById.get(character.id);
  assertNonNullable(state, `missing itinerary state for ${character.id}`);
  return {
    level,
    character,
    activitySourceIndex,
    state,
    roomItemsByRoomId,
    charactersById,
    characterStatesById,
    poseOverridesByCharacterId,
    timestamp,
    timestampKind
  };
}

function _activityAffectsPoseAtTimestamp(activity:ParsedItineraryActivity):boolean {
  if (activity.timestampKind !== 'absolute') return false;
  return activity.activityText.startsWith('@ ') || activity.activityText.startsWith('takes ');
}

function _calcActivityCompletionTime(activity:ParsedItineraryActivity, events:ItineraryEvent[]):number {
  return events.reduce((maxEndTime, event) => Math.max(maxEndTime, event.startTime + event.duration), activity.resolvedTime);
}

function _createPoseOverridesForTimestamp(level:Level, activities:ParsedItineraryActivity[], roomItemsByRoomId:Map<string, Item[]>,
  charactersById:Map<string, Character>, characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  levelFilename:string):Map<string, Position> {
  const poseOverridesByCharacterId = new Map<string, Position>();

  activities.forEach(activity => {
    _runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!_activityAffectsPoseAtTimestamp(activity)) return;
      const character = charactersById.get(activity.characterId);
      assertNonNullable(character, `unknown character '${activity.characterId}' in itinerary`);

      const state = characterStatesById.get(activity.characterId);
      assertNonNullable(state, `missing itinerary state for ${activity.characterId}`);

      const previewState = duplicateCharacterActivityState(state);
      const previewCharacterStatesById = new Map(characterStatesById);
      previewCharacterStatesById.set(activity.characterId, previewState);
      const previewRoomItemsByRoomId = duplicateRoomItemsByRoomId(roomItemsByRoomId);
      const previewContext = _createActivityContext(level, character, activity.resolvedTime, activity.timestampKind, activity.sourceIndex, previewRoomItemsByRoomId,
        charactersById, previewCharacterStatesById, poseOverridesByCharacterId);
      const events = _createEventsForActivity(activity.activityText, previewContext);
      appendEventsToCharacterState(level, character, previewState, events);
      poseOverridesByCharacterId.set(activity.characterId,
        findStatePoseAtTime(character, previewState, activity.resolvedTime).position);
    });
  });

  return poseOverridesByCharacterId;
}

function _createEventsForActivity(activityText:string, context:ActivityContext):ItineraryEvent[] {
  const activityFactories = [
    tryCreateAtActivity,
    tryCreateSayActivity,
    tryCreateWanderActivity,
    tryCreateTakeActivity,
    tryCreateFaceActivity
  ];

  for (const createActivityEvents of activityFactories) {
    const events = createActivityEvents(activityText, context);
    if (events !== null) return events;
  }

  throw new Error(`unsupported itinerary activity '${activityText}'`);
}

function _createReadyToScheduleBySourceIndex(activities:ParsedItineraryActivity[]):Map<number, boolean> {
  const readyBySourceIndex = new Map<number, boolean>();
  const charactersWithUnresolvedEarlierActivities = new Set<string>();

  activities.forEach(activity => {
    const isReady = activity.isTimeResolved && !charactersWithUnresolvedEarlierActivities.has(activity.characterId);
    readyBySourceIndex.set(activity.sourceIndex, isReady);
    if (!activity.isTimeResolved) charactersWithUnresolvedEarlierActivities.add(activity.characterId);
  });

  return readyBySourceIndex;
}

function _scheduleActivities(level:Level, activities:ParsedItineraryActivity[], levelFilename:string):{
  characters:Character[],
  duration:number,
  labels:TimeLabel[],
  completionTimesBySourceIndex:Map<number, number>
} {
  if (!activities.length) {
    return {
      characters: level.characters,
      ..._createLevelDurationAndLabels(level.characters),
      completionTimesBySourceIndex:new Map()
    };
  }

  const charactersById = new Map(level.characters.map(character => [character.id, character]));
  const characterStatesById = new Map(level.characters.map(character => [character.id, createCharacterActivityState(character)]));
  const roomItemsByRoomId = createInitialRoomItemsByRoomId(level);
  const completionTimesBySourceIndex = new Map<number, number>();
  const readyToScheduleBySourceIndex = _createReadyToScheduleBySourceIndex(activities);

  const _processActivity = (activity:ParsedItineraryActivity, poseOverridesByCharacterId:Map<string, Position>) => {
    _runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!readyToScheduleBySourceIndex.get(activity.sourceIndex)) return;
      const character = charactersById.get(activity.characterId);
      assertNonNullable(character, `unknown character '${activity.characterId}' in itinerary`);
      const context = _createActivityContext(level, character, activity.resolvedTime, activity.timestampKind, activity.sourceIndex, roomItemsByRoomId, charactersById,
        characterStatesById, poseOverridesByCharacterId);
      const events = _createEventsForActivity(activity.activityText, context);
      appendEventsToCharacterState(level, character, context.state, events);
      if (!events.length) context.state.time = Math.max(context.state.time, activity.resolvedTime);
      completionTimesBySourceIndex.set(activity.sourceIndex, _calcActivityCompletionTime(activity, events));
    });
  };

  const sortedActivities = _sortActivitiesByResolvedTime(activities);
  for (let i = 0; i < sortedActivities.length;) {
    const timestamp = sortedActivities[i].resolvedTime;
    const sameTimeActivities:ParsedItineraryActivity[] = [];
    while (i < sortedActivities.length && sortedActivities[i].resolvedTime === timestamp) {
      sameTimeActivities.push(sortedActivities[i]);
      ++i;
    }

    const readySameTimeActivities = sameTimeActivities.filter(activity => readyToScheduleBySourceIndex.get(activity.sourceIndex));
    const poseOverridesByCharacterId = _createPoseOverridesForTimestamp(level, readySameTimeActivities,
      roomItemsByRoomId, charactersById, characterStatesById, levelFilename);
    sameTimeActivities.forEach(activity => _processActivity(activity, poseOverridesByCharacterId));
  }

  const characters = level.characters.map(character => {
    const state = characterStatesById.get(character.id);
    assertNonNullable(state, `missing final itinerary state for ${character.id}`);
    const itinerary = [...state.events];
    return {
      ...character,
      itinerary,
      itineraryIndex: createItineraryIndex(itinerary, { x:character.x, y:character.y }),
      facingAngle: findCharacterPose({ ...character, itinerary }, level.startTime).facingAngle,
      items: state.carriedItems.map(duplicateItem)
    };
  });

  return {
    characters,
    ..._createLevelDurationAndLabels(characters),
    completionTimesBySourceIndex
  };
}

function _calcItineraryDuration(itinerary:ItineraryEvent[]):number {
  const lastEvent = itinerary[itinerary.length - 1];
  return lastEvent ? lastEvent.startTime + lastEvent.duration : 0;
}

function _createLevelDurationAndLabels(characters:Character[]):{ duration:number, labels:TimeLabel[] } {
  const duration = Math.max(0, ...characters.map(character => _calcItineraryDuration(character.itinerary)));
  return { duration, labels: _createTimeLabels(duration) };
}

function _loadItineraries(level:Level, itinerarySection:string, levelFilename:string, firstLineNo:number):{ characters:Character[], duration:number, labels:TimeLabel[] } {
  const activities = _parseItineraryActivities(itinerarySection, levelFilename, firstLineNo);
  if (!activities.length) {
    return {
      characters: level.characters,
      ..._createLevelDurationAndLabels(level.characters)
    };
  }
  let resolvedActivities = _resolveItineraryActivityTimes(activities);

  for (let attemptNo = 0; attemptNo < Math.max(2, activities.length + 1); ++attemptNo) {
    const scheduleResult = _scheduleActivities(level, resolvedActivities, levelFilename);
    const nextResolvedActivities = _resolveItineraryActivityTimes(activities, scheduleResult.completionTimesBySourceIndex);
    const didStabilize = nextResolvedActivities.every((activity, index) =>
      activity.resolvedTime === resolvedActivities[index].resolvedTime
      && activity.isTimeResolved === resolvedActivities[index].isTimeResolved);
    if (didStabilize) {
      return {
        characters:scheduleResult.characters,
        duration:scheduleResult.duration,
        labels:scheduleResult.labels
      };
    }
    resolvedActivities = nextResolvedActivities;
  }

  throw new Error('unable to resolve relative itinerary timestamps');
}

export function loadLevelFromText(text:string, levelFilename:string = '<inline>'):Level {
  const sections = parseSections(text);
  const generalSection = _parseGeneralSection(sections.general || "");
  const itinerarySection = sections.itinerary || "";
  const itineraryFirstLineNo = _findSectionFirstContentLineNo(text, 'itinerary') || 1;
  let level = _createEmptyLevel();
  level = {
    ...level,
    activeCharacterId: generalSection.activeCharacterId || level.activeCharacterId,
    startTime: generalSection.startTime ?? level.startTime
  };
  const characterDefinitions = _parseCharacterDefinitions(sections.characters || "");
  const itemDefinitions = _parseItemDefinitions(sections.items || "");
  _createRoomsFromMapSection(level, sections.map || "", sections.rooms || "");
  _addRoomPositionMarkersFromSections(level, sections.rooms || "", characterDefinitions, itemDefinitions);
  _addRoomExitsFromRoomsSection(level, sections.rooms || "");
  _generateRoomWaypoints(level);
  _addCharactersAndRoomItemsFromSections(level, sections.rooms || "", characterDefinitions, itemDefinitions);
  _addInventoryItemsToCharacters(level, characterDefinitions, itemDefinitions);
  const itineraryData = _loadItineraries(level, itinerarySection, levelFilename, itineraryFirstLineNo);
  level = {
    ...level,
    activeCharacterId: level.activeCharacterId || level.characters[0]?.id || "",
    characters: itineraryData.characters,
    duration: itineraryData.duration,
    labels: itineraryData.labels
  };
  return level;
}

export async function loadLevelFromUrl(levelFileUrl:string):Promise<Level> {
  const response = await fetch(levelFileUrl);
  const text = await response.text();
  return loadLevelFromText(text, levelFileUrl);
}
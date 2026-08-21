import Room, { MutableRoom } from '@/game/types/Room';
import { ErrorCollector } from '../errorCollection';
import { MutableItem } from '@/game/types/Item';
import { MutableLevel } from '@/game/types/Level';
import { applyRoomMetaDataFromSections, createRoomsFromMapSection } from './roomLayoutUtil';
import { addExitsToRooms } from './roomExitUtil';
import { generateStairFlights } from './stairFlightUtil';
import { generateStairParts } from './stairPartUtil';
import { connectWaypoints, generateWaypoints } from './waypointGenerationUtil';
import LevelFileSections from '../types/LevelFileSections';
import { findGroundFloorY, validateOutsideRoomsAgainstGroundFloor } from './groundFloorUtil';
import { parseLegendGrid } from './legendGridUtil';
import { parseSections } from '@/common/markdownUtil';
import Position from '@/game/types/Position';
import Waypoint from '../types/Waypoint';
import { normalizeId } from '@/game/idUtil';
import { assert, assertNonNullable } from 'decent-portal';
import { getSectionIdsFromSectionText } from '../levelFileSectionUtil';
import WaypointGenerationContext from '../types/WaypointGenerationContext';
import { findExitWaypoint } from '../activityLoading/waypointFindingUtil';
import { calcFloorSquareCenter } from '@/game/squareUtil';

type PartiallyLoadedRooms = {
  rooms:MutableRoom[],
  waypointGenerationContext:WaypointGenerationContext,
  initiallyObscuredRoomIds:ReadonlySet<string>
}

function _connectSharedExitWaypoints(rooms:Room[], context:WaypointGenerationContext):void {
  rooms.forEach(room1 => room1.exits.forEach(exit => {
    if (exit.room1Id !== room1.id) return;
    const room2 = rooms.find(room => room.id === exit.room2Id);
    assertNonNullable(room2);
    const room1Waypoints = context.waypointsByRoomId.get(room1.id);
    const room2Waypoints = context.waypointsByRoomId.get(room2.id);
    assertNonNullable(room1Waypoints);
    assertNonNullable(room2Waypoints);
    const waypoint1 = findExitWaypoint(room1.id, room1.rect, exit, room1Waypoints);
    const waypoint2 = findExitWaypoint(room2.id, room2.rect, exit, room2Waypoints);
    assert(waypoint1 !== waypoint2);
    assert(waypoint1.roomId === room1.id && waypoint2.roomId === room2.id);
    connectWaypoints(waypoint1, waypoint2);
  }));
}

// Returns rooms with everything loaded from level file except dependencies, e.g. items. The exception is room styles, which are applied,
// because nothing else uses room styles besides rooms.
export function loadRoomsPartially(sections:LevelFileSections, availableItems:MutableItem[], errors:ErrorCollector):PartiallyLoadedRooms|null {
  const originalErrorCount = errors.count;

  const availableCharacterIds = getSectionIdsFromSectionText(sections.characters.text, 2, 'characters', errors);
  const mapLegendGrid = parseLegendGrid(sections.map.text, errors, ['map']);
  if (!mapLegendGrid) return null;
  const rooms:Room[] = createRoomsFromMapSection(mapLegendGrid, errors);
  const initiallyObscuredRoomIds = applyRoomMetaDataFromSections(sections.rooms.text, sections['room styles']?.text ?? '',
    rooms, availableItems, availableCharacterIds, errors);
  if (!initiallyObscuredRoomIds) return null;
  addExitsToRooms(sections.rooms.text, rooms, errors);

  const waypointsByRoomId = new Map<string, Waypoint[]>();
  const waypointGenerationContext:WaypointGenerationContext = { waypoints:[], waypointsByRoomId };
  rooms.forEach(room => {
    const flights = generateStairFlights(room);
    const stairParts = generateStairParts(room, flights);
    room.stairParts.push(...stairParts);
    const waypoints = generateWaypoints(room.id, room.rect, room.exits, flights);
    waypointGenerationContext.waypoints.push(...waypoints);
    waypointsByRoomId.set(room.id, waypoints);
  });
  _connectSharedExitWaypoints(rooms, waypointGenerationContext);

  return errors.count <= originalErrorCount ? { rooms, waypointGenerationContext, initiallyObscuredRoomIds } : null;
}

export function addRoomsToLevel(rooms:Room[], groundFloorRoomRef:string|null, level:MutableLevel, errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;
  const groundFloorY = findGroundFloorY(rooms, groundFloorRoomRef, errors);
  if (!validateOutsideRoomsAgainstGroundFloor(rooms, groundFloorRoomRef, groundFloorY, errors)) return false;
  level.rooms = rooms;
  level.groundFloorY = groundFloorY;
  return errors.count <= originalErrorCount;
}

type CharacterIdToPosition = Record<string, Position>;

export function findAllCharacterPositions(rooms:Room[], characterIds:string[], roomsSectionText:string, errors:ErrorCollector):CharacterIdToPosition {
  const roomSections = parseSections(roomsSectionText, 2, false);
  const characterIdToPosition:CharacterIdToPosition = {};
  const roomSectionNames = Object.keys(roomSections);
  roomSectionNames.forEach(roomSectionName => {
    const roomId = normalizeId(roomSectionName);
    const roomLegendGrid = parseLegendGrid(roomSections[roomSectionName], errors, ['rooms', roomSectionName]);
    if (!roomLegendGrid || roomLegendGrid.entries.length === 0) return; // If a room section doesn't have a legend grid, then no characters are there.
    roomLegendGrid.entries.forEach(entry => {
      if (characterIds.includes(entry.id)) {
        const room = rooms.find(r => r.id === roomId);
        assertNonNullable(room);
        const position = calcFloorSquareCenter(room.rect, entry.col, entry.row);
        characterIdToPosition[entry.id] = position;
      }
    });
  });
  return characterIdToPosition;
}
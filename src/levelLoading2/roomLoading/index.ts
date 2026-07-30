import Room from '@/game/types/Room';
import { ErrorCollector } from '../errorCollection';
import Item from '@/game/types/Item';
import { MutableLevel } from '@/game/types/Level';
import { applyRoomMetaDataFromSections, createRoomsFromMapSection } from './roomLayoutUtil';
import { addExitsToRooms } from './roomExitUtil';
import { generateStairFlights } from './stairFlightUtil';
import { generateStairParts } from './stairPartUtil';
import { calcFloorPositionInRoom, generateWaypoints } from './waypointGenerationUtil';
import LevelFileSections from '../types/LevelFileSections';
import { findGroundFloorY, validateOutsideRoomsAgainstGroundFloor } from './groundFloorUtil';
import { parseLegendGrid } from './legendGridUtil';
import { parseSections } from '@/common/markdownUtil';
import Position from '@/game/types/Position';
import { normalizeId } from '@/game/idUtil';
import { assertNonNullable } from 'decent-portal';
import { getSectionIdsFromSectionText } from '../levelFileSectionUtil';

// Returns rooms with everything loaded from level file except dependencies, e.g. items. The exception is room styles, which are applied,
// because nothing else uses room styles besides rooms.
export function loadRoomsPartially(sections:LevelFileSections, availableItems:Item[], errors:ErrorCollector):Room[] | null {
  const originalErrorCount = errors.count;

  const availableCharacterIds = getSectionIdsFromSectionText(sections.characters.text, 2, 'characters', errors);
  const mapLegendGrid = parseLegendGrid(sections.map.text, errors, ['map']);
  if (!mapLegendGrid) return null;
  const rooms:Room[] = createRoomsFromMapSection(mapLegendGrid, errors);
  if (!applyRoomMetaDataFromSections(sections.rooms.text, sections['room styles']?.text ?? '', 
    rooms, availableItems, availableCharacterIds, errors)) return null;
  addExitsToRooms(sections.rooms.text, rooms, errors);
  
  rooms.forEach(room => {
    const flights = generateStairFlights(room);
    const stairParts = generateStairParts(room, flights);
    room.stairParts.push(...stairParts);
    const waypoints = generateWaypoints(room.id, room.rect, room.exits, flights);
    room.waypoints.push(...waypoints);
  });

  return errors.count <= originalErrorCount ? rooms : null;
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
        const position = calcFloorPositionInRoom(room, entry.col, entry.row);
        characterIdToPosition[entry.id] = position;
      }
    });
  });
  return characterIdToPosition;
}
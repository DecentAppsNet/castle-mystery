import Room from '@/game/types/Room';
import ErrorCollector from '../errorCollection/ErrorCollector';
import Item from '@/game/types/Item';
import { MutableLevel } from '@/game/types/Level';
import { applyRoomMetaDataFromSections, createRoomsFromMapSection, validateMapLegendRoomsExistInRoomsSection } from './roomLayoutUtil';
import { addExitsToRooms } from './roomExitUtil';
import { generateStairFlights } from './stairFlightUtil';
import { generateStairParts } from './stairPartUtil';
import { generateWaypoints } from './waypointGenerationUtil';
import LevelFileSections from '../types/LevelFileSections';
import { mergeRoomItems } from './roomItemUtil';
import { findGroundFloorY, validateOutsideRoomsAgainstGroundFloor } from './groundFloorUtil';
import { parseLegendGrid } from './legendGridUtil';

// Returns rooms with everything loaded from level file except dependencies, e.g. items. The exception is room styles, which are applied,
// because nothing else uses room styles besides rooms.
export function loadRoomsPartially(sections:LevelFileSections, errors:ErrorCollector):Room[] | null {
  const originalErrorCount = errors.errorCount;

  const mapLegendGrid = parseLegendGrid(sections.map.text, errors);
  if (!mapLegendGrid) return null;
  const rooms:Room[] = createRoomsFromMapSection(mapLegendGrid, errors);
  validateMapLegendRoomsExistInRoomsSection(mapLegendGrid, sections.rooms.text, errors);
  applyRoomMetaDataFromSections(sections.rooms.text, sections.roomStyles?.text ?? '', rooms, errors);
  addExitsToRooms(sections.rooms.text, rooms, errors);
  
  rooms.forEach(room => {
    const flights = generateStairFlights(room);
    const stairParts = generateStairParts(room, flights);
    room.stairParts.push(...stairParts);
    const waypoints = generateWaypoints(room.id, room.rect, room.exits, flights);
    room.waypoints.push(...waypoints);
  });

  return errors.errorCount <= originalErrorCount ? rooms : null;
}

export function addRoomsToLevel(rooms:Room[], items:Item[], groundFloorRoomId:string|null, level:MutableLevel, errors:ErrorCollector):boolean {
  if (!mergeRoomItems(rooms, items, errors)) return false;
  const groundFloorY = findGroundFloorY(rooms, groundFloorRoomId, errors);
  if (!validateOutsideRoomsAgainstGroundFloor(rooms, groundFloorRoomId, groundFloorY, errors)) return false;
  level.rooms = rooms;
  level.groundFloorY = groundFloorY;
  return true;
}
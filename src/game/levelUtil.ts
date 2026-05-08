import { assertNonNullable } from "decent-portal";
import Level from "./types/Level";
import Item from "./types/Item";
import Room from "./types/Room";
import Rect from "./types/Rect";
import Character from './types/Character';
import { findRoom } from "./roomUtil";
import { createItineraryIndex, generateRandomItinerary } from "./itineraryUtil";
import TimeLabel from "./types/TimeLabel";
import { MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import { isPositionInRoomObstruction, isPositionWithinRoomObstructionMargin } from "./obstructionUtil";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import { parseFirstFencedCodeBlockLines, parseNameValueLines, parseOptions, parseSections } from "@/common/markdownUtil";
import { baseUrl } from "@/common/urlUtil";

const MAP_TILE_SIZE = 20;

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

function _createRoomsFromMapSection(level:Level, mapSection:string) {
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
      exits: [],
      isDiscovered: false
    });
  });
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

function _findCharacterStartPosition(room:Room):[x:number, y:number] {
  const centerX = Math.floor(room.rect.x + room.rect.width / 2);
  const centerY = Math.floor(room.rect.y + room.rect.height / 2);
  let nearestPosition:[x:number, y:number]|null = null;
  let nearestDistanceSquared = Infinity;

  for (let y = room.rect.y + 1; y < room.rect.y + room.rect.height - 1; ++y) {
    for (let x = room.rect.x + 1; x < room.rect.x + room.rect.width - 1; ++x) {
      if (isPositionWithinRoomObstructionMargin(room, x, y)) continue;
      const distanceSquared = (centerX - x) ** 2 + (centerY - y) ** 2;
      if (distanceSquared < nearestDistanceSquared) {
        nearestPosition = [x, y];
        nearestDistanceSquared = distanceSquared;
      }
    }
  }

  assertNonNullable(nearestPosition, `no unobstructed character start position available in room ${room.id}`);
  return nearestPosition;
}

function _addItemsToCharacter(level:Level, characterId:string, items:Item[]) {
  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character, `character ${characterId} not found`);
  character.items.push(...items.map(item => ({ ...item, position:{ ...item.position } })));
}

function _addCharacterToRoom(level:Level, roomId:string, characterId:string, description:string) {
  const room = findRoom(level.rooms, roomId);
  assertNonNullable(room);
  if (level.activeCharacterId === '') level.activeCharacterId = characterId;
  const [x, y] = _findCharacterStartPosition(room);
  const character:Character = {
    id: characterId,
    description,
    items: [],
    x,
    y,
    facingAngle:0,
    itinerary:[],
    itineraryIndex:{ eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
  };
  level.characters.push(character);
}

function _generateCharacterItinerary(level:Level, characterId:string, duration:number) {
  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character, `character ${characterId} not found`);
  const itinerary = generateRandomItinerary(level, character, duration);
  character.itinerary = itinerary;
  character.itineraryIndex = createItineraryIndex(itinerary);
  const firstWalkEvent = itinerary.find(event => event.type === ItineraryEventType.WALK) as WalkEvent|undefined;
  character.facingAngle = firstWalkEvent?.facingAngle ?? 0;
}

export function createExampleLevel2(duration:number = MSECS_IN_DAY):Level {
  const level:Level = {
    rooms: [
      {
        id: "livingRoom",
        title: "Living Room",
        rect: { x: 0, y: 0, width: 50, height: 100 },
        items: [],
        obstructions: [
          { rect: { x: 10, y: 18, width: 4, height: 50 } },
          { rect: { x: 28, y: 58, width: 10, height: 18 } }
        ],
        exits: [],
        isDiscovered: false
      },
      {
        id: "bedroom",
        title: "Bedroom",
        rect: { x: 50, y: 0, width: 50, height: 30 },
        items: [],
        obstructions: [
          { rect: { x: 80, y: 5, width: 16, height: 4 } }
        ],
        exits: [],
        isDiscovered: true
      },
      {
        id: "bathroom",
        title: "Bathroom",
        rect: { x: 50, y: 30, width: 50, height: 20 },
        items: [],
        obstructions: [
          { rect: { x: 82, y: 34, width: 10, height: 10 } }
        ],
        exits: [],
        isDiscovered: false
      },
      {
        id: "kitchen",
        title: "Kitchen",
        rect: { x: 50, y: 50, width: 50, height: 50 },
        items: [],
        obstructions: [
          { rect: { x: 58, y: 60, width: 14, height: 10 } },
          { rect: { x: 78, y: 74, width: 12, height: 14 } }
        ],
        exits: [],
        isDiscovered: false
      },
    ],
    characters: [],
    activeCharacterId: 'king',
    startTime: 0,
    duration,
    labels: _createTimeLabels(duration)
  }
  _addExitBetweenRooms(level, 'livingRoom', 'bedroom');
  _addExitBetweenRooms(level, 'bedroom', 'bathroom');
  _addExitBetweenRooms(level, 'livingRoom', 'kitchen');
  _addItemToRoom(level, 'livingRoom', {
    id:'living-room-lamp', title:'Floor Lamp', displayChar:'⌁', position:{x:6, y:12},
    description:'A slim standing lamp with a pleated shade.'
  });
  _addItemToRoom(level, 'livingRoom', {
    id:'living-room-book', title:'Novel', displayChar:'⌸', position:{x:21, y:82},
    description:'A dog-eared mystery novel left open face down.'
  });
  _addItemToRoom(level, 'livingRoom', {
    id:'living-room-vase', title:'Vase', displayChar:'◔', position:{x:41, y:18},
    description:'A ceramic vase with a narrow neck and no flowers.'
  });
  _addItemToRoom(level, 'bedroom', {
    id:'bedroom-clock', title:'Alarm Clock', displayChar:'◷', position:{x:60, y:22},
    description:'A small alarm clock with glowing hands.'
  });
  _addItemToRoom(level, 'bedroom', {
    id:'bedroom-slippers', title:'Slippers', displayChar:'⋈', position:{x:91, y:23},
    description:'A pair of worn slippers lined up by the wall.'
  });
  _addItemToRoom(level, 'bedroom', {
    id:'bedroom-mirror', title:'Hand Mirror', displayChar:'⊙', position:{x:72, y:17},
    description:'A hand mirror with a silvered rim.'
  });
  _addItemToRoom(level, 'bathroom', {
    id:'bathroom-brush', title:'Hairbrush', displayChar:'≣', position:{x:58, y:43},
    description:'A wooden hairbrush with several strands caught in it.'
  });
  _addItemToRoom(level, 'bathroom', {
    id:'bathroom-towel', title:'Towel', displayChar:'▤', position:{x:72, y:46},
    description:'A folded towel draped over the edge of a stand.'
  });
  _addItemToRoom(level, 'kitchen', {
    id:'kitchen-kettle', title:'Kettle', displayChar:'◒', position:{x:91, y:60},
    description:'A stout kettle with a soot-darkened base.'
  });
  _addItemToRoom(level, 'kitchen', {
    id:'kitchen-plate', title:'Plate', displayChar:'◌', position:{x:54, y:91},
    description:'A plain ceramic plate with a chipped rim.'
  });
  _addCharacterToRoom(level, 'bedroom', 'king', 'A tired ruler in a rumpled nightshirt, watching the house with anxious eyes.');
  _addCharacterToRoom(level, 'livingRoom', 'queen', 'A poised noblewoman whose careful posture hides a restless tension.');
  _addItemsToCharacter(level, 'king', [{
    id:'king-pocket-watch', title:'Pocket Watch', displayChar:'◷', position:{x:0, y:0},
    description:'A silver pocket watch engraved with a fading crest.', isDiscovered:true
  }]);
  _addItemsToCharacter(level, 'queen', [{
    id:'queen-master-key', title:'Master Key', displayChar:'⌘', position:{x:0, y:0},
    description:'A long iron key on a dark velvet ribbon.', isDiscovered:true
  }, {
    id:'queen-folded-note', title:'Folded Note', displayChar:'⌷', position:{x:0, y:0},
    description:'A tightly folded note with a broken wax seal.', isDiscovered:true
  }]);
  _generateCharacterItinerary(level, 'king', duration);
  _generateCharacterItinerary(level, 'queen', duration);
  return level;
}

export function loadLevelFromText(text:string):Level {
  const sections = parseSections(text);
  const level = _createEmptyLevel();
  _createRoomsFromMapSection(level, sections.map || "");
  _addRoomExitsFromRoomsSection(level, sections.rooms || "");
  return level;
}

export async function loadLevelFromUrl(levelFileUrl:string):Promise<Level> {
  const response = await fetch(levelFileUrl);
  const text = await response.text();
  return loadLevelFromText(text);
}

export async function createExampleLevel(duration:number):Promise<Level> {
  const level = await loadLevelFromUrl(baseUrl('/levels/kingacide.md'));
  level.duration = duration;
  level.labels = _createTimeLabels(duration)
  _addCharacterToRoom(level, 'Throne Room', 'King', 'A tired ruler in a rumpled nightshirt, watching the house with anxious eyes.');
  _addCharacterToRoom(level, 'Library', 'Queen', 'A poised noblewoman whose careful posture hides a restless tension.');
  _generateCharacterItinerary(level, 'King', duration);
  _generateCharacterItinerary(level, 'Queen', duration);
  return level;
}
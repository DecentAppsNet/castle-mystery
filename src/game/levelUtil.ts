import { assertNonNullable } from "decent-portal";
import Level from "./types/Level";
import Room from "./types/Room";
import Rect from "./types/Rect";
import Character from './types/Character';
import { findRoom } from "./roomUtil";
import { createItineraryIndex, generateRandomItinerary } from "./itineraryUtil";
import TimeLabel from "./types/TimeLabel";
import { MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";

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

function _addCharacterToRoom(level:Level, roomId:string, characterId:string, duration:number) {
  const room = findRoom(level.rooms, roomId);
  assertNonNullable(room);
  const x = Math.floor(room.rect.x + room.rect.width / 2);
  const y = Math.floor(room.rect.y + room.rect.height / 2);
  const itinerary = generateRandomItinerary(level, x, y, duration);
  const character:Character = { id: characterId, x, y, facingAngle:itinerary[0].facingAngle, itinerary, itineraryIndex:createItineraryIndex(itinerary) };
  level.characters.push(character);
}

export function createExampleLevel(duration:number = MSECS_IN_DAY):Level {
  const level:Level = {
    rooms: [
      {
        id: "livingRoom",
        title: "Living Room",
        rect: { x: 0, y: 0, width: 50, height: 100 },
        exits: [],
        isDiscovered: false
      },
      {
        id: "bedroom",
        title: "Bedroom",
        rect: { x: 50, y: 0, width: 50, height: 30 },
        exits: [],
        isDiscovered: true
      },
      {
        id: "bathroom",
        title: "Bathroom",
        rect: { x: 50, y: 30, width: 50, height: 20 },
        exits: [],
        isDiscovered: false
      },
      {
        id: "kitchen",
        title: "Kitchen",
        rect: { x: 50, y: 50, width: 50, height: 50 },
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
  _addCharacterToRoom(level, 'bedroom', 'king', duration);
  _addCharacterToRoom(level, 'livingRoom', 'queen', duration);
  return level;
}
import { assert, assertNonNullable } from "decent-portal";
import Level from "./types/Level";
import Room from "./types/Room";
import Rect from "./types/Rect";
import Character from './types/Character';
import RoomExit from "./types/RoomExit";

const ROOM_FONT_HEIGHT_RATIO = 0.02; // Font height as a ratio of the canvas height.
const ROOM_LINE_WIDTH = 0.005;

type ScalingFactors = {
  scaleX:number,
  translateX:number,
  scaleY:number
  translateY:number,
  roomFontHeight:number,
  roomLineWidth:number
}

function _scaleCoords(x:number, y:number, scalingFactors:ScalingFactors):[x:number, y:number] {
  return [x * scalingFactors.scaleX + scalingFactors.translateX, y * scalingFactors.scaleY + scalingFactors.translateY];
}

function _calcRoomsBoundingRect(rooms:Room[]):Rect {
  assert(rooms.length > 0);
  let leftX = rooms[0].rect.x, rightX = leftX + rooms[0].rect.width,
      topY = rooms[0].rect.y, bottomY = topY + rooms[0].rect.height;
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    leftX = Math.min(leftX, room.rect.x);
    rightX = Math.max(rightX, room.rect.x + room.rect.width);
    topY = Math.min(topY, room.rect.y);
    bottomY = Math.max(bottomY, room.rect.y + room.rect.height);
  }
  return {x:leftX, y:topY, width:rightX - leftX, height:bottomY - topY};
}

// Calculate scaling factors that will translate a rect of sourceWidth and sourceHeight dimensions so that
// it will fit centered insides of a rect of destWidth and destHeight, while maintaining the orginal aspect
// ratio of the source rect.
function _calcScalingFactors(sourceWidth:number, sourceHeight:number, destWidth:number, destHeight:number):ScalingFactors {
  if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
    // Will make a visible problem but maybe not crash anything. Potentially useful for edge cases.
    return {scaleX:0, translateX:0, scaleY:0, translateY:0, roomFontHeight:0, roomLineWidth:0}; 
  }
  const sourceAspectRatio = sourceWidth / sourceHeight;
  const destAspectRatio = destWidth / destHeight;
  let scaleX, translateX, scaleY, translateY;
  if (sourceAspectRatio > destAspectRatio) { // The source rect is wider than the destination rect. Scale based on width.
    scaleX = scaleY = destWidth / sourceWidth;
    translateX = 0;
    translateY = (destHeight - sourceHeight * scaleY) / 2;
  } else { // The source rect is taller than the destination rect. Scale based on height.
    scaleX = scaleY = destHeight / sourceHeight;
    translateX = (destWidth - sourceWidth * scaleX) / 2;
    translateY = 0;
  }
  const roomFontHeight = Math.round(destHeight * ROOM_FONT_HEIGHT_RATIO);
  const roomLineWidth = Math.max(1, destHeight * ROOM_LINE_WIDTH);
  return {scaleX, translateX, scaleY, translateY, roomFontHeight, roomLineWidth};
}

function _drawRoomExit(exit:RoomExit, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const { roomLineWidth } = scalingFactors;
  const [exitX, exitY] = _scaleCoords(exit.x, exit.y, scalingFactors);
  const left = exitX - roomLineWidth;
  const top = exitY - roomLineWidth;
  const width = roomLineWidth * 3;
  const height = roomLineWidth * 3;
  context.fillRect(left, top, width, height);
}

function _drawRoom(room:Room, charactersInRoom:Character[], isActive:boolean, 
      scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  if (!room.isDiscovered) return;
  const scaledTopLeft = _scaleCoords(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = _scaleCoords(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const scaledWidth = scaledBottomRight[0] - scaledTopLeft[0];
  const scaledHeight = scaledBottomRight[1] - scaledTopLeft[1];
  context.lineWidth = scalingFactors.roomLineWidth;
  if (isActive) {
    context.fillStyle = "#ddd";
    context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  }
  context.strokeStyle = "#333";
  context.strokeRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#aaa";
  context.font = `${scalingFactors.roomFontHeight}px Jellee`;
  context.fillText(room.title, scaledTopLeft[0] + scaledWidth / 2, scaledTopLeft[1] + scaledHeight / 2);
  context.fillStyle = "#000";
  room.exits.forEach(exit => _drawRoomExit(exit, scalingFactors, context));
  if (isActive) charactersInRoom.forEach(character => _drawCharacter(character, scalingFactors, context));
}

// Draw a stick figure inside the rect of the character.
function _drawCharacter(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const { roomLineWidth } = scalingFactors;
  const [centerX, bottomY] = _scaleCoords(character.x, character.y, scalingFactors);
  const characterWidth = roomLineWidth * 5;
  const characterHeight = roomLineWidth * 10;
  const centerY = Math.round(bottomY - characterHeight / 2);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.arc(centerX, centerY - characterHeight / 4, headRadius, 0, 2 * Math.PI); // Head
  context.moveTo(centerX, centerY - characterHeight / 4 + headRadius); // Move to neck
  context.lineTo(centerX, centerY + characterHeight / 4); // Body
  context.moveTo(centerX, centerY); // Move to middle of body
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 8); // Left arm
  context.moveTo(centerX, centerY); // Move back to middle of body
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 8); // Right arm
  context.moveTo(centerX, centerY + characterHeight / 4); // Move to bottom of body
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 2); // Left leg
  context.moveTo(centerX, centerY + characterHeight / 4); // Move back to bottom of body
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 2); // Right leg
  context.stroke();
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

function _findExitCoordsFromSharedWallSection(sharedWallSection:Rect):[x:number, y:number] {
  return sharedWallSection.height === 0
    ? [Math.round(sharedWallSection.x + sharedWallSection.width / 2), sharedWallSection.y]
    : [sharedWallSection.x, Math.round(sharedWallSection.y + sharedWallSection.height / 2)];
}

function _findRoom(level:Level, roomId:string):Room {
  const room = level.rooms.find((r) => r.id === roomId);
  assertNonNullable(room, `room with id ${roomId} not found`);
  return room;
}

function _addExitBetweenRooms(level:Level, room1Id:string, room2Id:string) {
  const room1 = _findRoom(level, room1Id);
  const room2 = _findRoom(level, room2Id);
  const sharedWallSection = _findSharedWallSectionBetweenRooms(room1, room2);
  assertNonNullable(sharedWallSection, 'rooms must be adjacent');
  const [x,y] = _findExitCoordsFromSharedWallSection(sharedWallSection);
  const exit = { room1Id, room2Id, x, y }
  room1.exits.push(exit);
  room2.exits.push(exit);
}

function _addCharacterToRoom(level:Level, roomId:string, characterId:string) {
  const room = _findRoom(level, roomId);
  assertNonNullable(room);
  const x = Math.floor(room.rect.x + room.rect.width / 2);
  const y = Math.floor(room.rect.y + room.rect.height / 2);
  const character:Character = { id: characterId, x, y };
  level.characters.push(character);
}

function _areCoordsInRect(x:number, y:number, rect:Rect):boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function _findCharactersInRoom(room:Room, characters:Character[]):Character[] {
  return characters.filter(character => _areCoordsInRect(character.x, character.y, room.rect));
}

export function updateAndDrawLevel(level:Level, context:CanvasRenderingContext2D) {
  const roomsBoundingRect = _calcRoomsBoundingRect(level.rooms);
  const scalingFactors = _calcScalingFactors(roomsBoundingRect.width, roomsBoundingRect.height, context.canvas.width, context.canvas.height);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  for(let roomI = 0; roomI < level.rooms.length; ++roomI) {
    const room = level.rooms[roomI];
    const charactersInRoom = _findCharactersInRoom(room, level.characters);
    const isActive = charactersInRoom.some(c => c.id === level.activeCharacterId);
    _drawRoom(room, charactersInRoom, isActive, scalingFactors, context);
  }
}

export function createExampleLevel():Level {
  const level:Level = {
    rooms: [
      {
        id: "livingRoom",
        title: "Living Room",
        rect: { x: 0, y: 0, width: 50, height: 100 },
        exits: [],
        isDiscovered: true
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
        isDiscovered: true
      },
    ],
    characters: [],
    activeCharacterId: 'king',
    startTime: 0
  }
  _addExitBetweenRooms(level, 'livingRoom', 'bedroom');
  _addExitBetweenRooms(level, 'bedroom', 'bathroom');
  _addExitBetweenRooms(level, 'livingRoom', 'kitchen');
  _addCharacterToRoom(level, 'bedroom', 'king');
  _addCharacterToRoom(level, 'livingRoom', 'queen');
  return level;
}
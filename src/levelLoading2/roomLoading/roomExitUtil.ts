import { parseOptions, parseUniqueNameValueLines, SectionEntryWithLine } from "@/common/markdownUtil";
import ErrorCollector from "../errorCollection/ErrorCollector";
import RoomExit, { createRoomExitId } from "@/game/types/RoomExit";
import { normalizeId } from "@/game/idUtil";
import { assert, assertNonNullable } from "decent-portal";
import ExitType from "@/game/types/ExitType";
import Room from "@/game/types/Room";
import { createNormalizedSectionEntryMap } from "../levelFileSectionUtil";
import { findRoom } from "@/game/roomUtil";
import ExitStatus from "@/game/types/ExitStatus";
import Rect from "@/game/types/Rect";

function _modifierTextToTokens(text:string):string[] {
  return text.split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);
}

function _splitExitOption(exitOptionText:string, errors:ErrorCollector):{roomId:string, modifierTokens:string[]} {
  let modifierTokens:string[] = [];
  let roomId = '';

  const leftParenPos = exitOptionText.indexOf('(');
  const rightParenPos = exitOptionText.indexOf(')');

  errors.matchNextLine(['rooms', roomId], '* exits=', '');

  if (leftParenPos === -1 && rightParenPos === -1) { // No parentheses found, so no modifier.
    return { roomId:normalizeId(exitOptionText), modifierTokens };
  }
  
  if (leftParenPos !== -1 && rightParenPos !== -1) { // Both parentheses found.
    if (leftParenPos >= rightParenPos) {
      errors.setNextCharRange(rightParenPos, leftParenPos+1);
      errors.add('")" preceding "(" with no matched "(". Fix parentheses.');
    } else {
      const modifiersText = exitOptionText.substring(leftParenPos + 1, rightParenPos);
      modifierTokens = _modifierTextToTokens(modifiersText);
    }
    const roomIdText = exitOptionText.substring(0, leftParenPos).trim();
    if (!roomIdText) {
      errors.setNextCharRange(leftParenPos, leftParenPos+1);
      errors.add('Expected a room ID.');
    }
    roomId = normalizeId(roomIdText);
    return { roomId, modifierTokens };
  }

  // One of two parentheses found.
  if (leftParenPos !== -1) {
    assert(rightParenPos === -1);
    errors.setNextCharRange(leftParenPos, leftParenPos+1);
    errors.add('Missing ")" to enclose modifier.');
  } else {
    assert(leftParenPos === -1);
    assert(rightParenPos !== -1);
    errors.setNextCharRange(rightParenPos, rightParenPos+1);
    errors.add('Missing "(" to enclose modifier.');
  }
  return { roomId, modifierTokens };
}

function _findExistingExitBetweenRooms(rooms:Room[], room1Id:string, room2Id:string):RoomExit|null {
  for(let roomI = 0; roomI < rooms.length; ++roomI) {
    const exits = rooms[roomI].exits;
    for(let exitI = 0; exitI < exits.length; ++exitI) {
      const exit = exits[exitI];
      if ((exit.room1Id === room1Id && exit.room2Id === room2Id) || 
        (exit.room1Id === room2Id && exit.room2Id === room1Id)) return exit;
    }
  }
  return null;
}

function _addRoomPairExit(exit:RoomExit, room1:Room, room2:Room) {
  assert(!room1.exits.some(e => e.id === exit.id));
  assert(!room2.exits.some(e => e.id === exit.id));
  room1.exits.push(exit);
  room2.exits.push(exit);
}

function _replaceRoomExit(oldExit:RoomExit, newExit:RoomExit, room:Room) {
  const i = room.exits.indexOf(oldExit);
  assert(i !== -1);
  room.exits[i] = newExit;
}

function _replaceRoomPairExit(oldExit:RoomExit, newExit:RoomExit, room1:Room, room2:Room) {
  _replaceRoomExit(oldExit, newExit, room1);
  _replaceRoomExit(oldExit, newExit, room2);
}

function _findExitTypeForModifiers(exitType:ExitType, modifierTokens:string[]) {
  modifierTokens.forEach(modifier => {
    switch(modifier) {
      case 'locked': case 'unlocked': case 'lockable': case 'unlockable':
        exitType = 'lockableDoor';
      break;

      case 'open': case 'closed':
        if (exitType !== 'lockableDoor') exitType = 'door';
      break;

      default:
        if (modifier.startsWith('lockable with ') || modifier.startsWith('unlockable with ')) exitType = 'lockableDoor';
      break;
    }
  });
  return exitType;
}

function _findExitStatusForModifiers(exitType:ExitType, exitStatus:ExitStatus, modifierTokens:string[]):ExitStatus {
  if (modifierTokens.includes('locked')) {
    assert(exitType === 'lockableDoor');
    return 'locked';
  }

  if (modifierTokens.includes('unlocked')) {
    assert(exitType === 'lockableDoor');
    if (exitStatus !== 'locked') exitStatus = 'locked';
    return exitStatus;
  }

  if (modifierTokens.includes('closed')) {
    if (exitStatus !== 'locked' && exitStatus !== 'unlocked') exitStatus = 'closed';
    return exitStatus;
  }

  return exitStatus;
}

const LOCKABLE_LENGTH = 'lockable with '.length;
const UNLOCKABLE_LENGTH = LOCKABLE_LENGTH + 2;
function _findLockableWithForModifiers(modifierTokens:string[]):string|null {
  const withToken = modifierTokens.find(t => t.startsWith('lockable with ')) ??
      modifierTokens.find(t => t.startsWith('unlockable with '));
  if (!withToken) return null;
  const roomIdPos = (withToken[0] === 'l') ? LOCKABLE_LENGTH : UNLOCKABLE_LENGTH;
  const roomId = normalizeId(withToken.substring(roomIdPos));
  return roomId;
}

function _createModifierUpdatedExit(exit:RoomExit, otherRoomId:string, modifierTokens:string[]):RoomExit {
  const isRoom1OtherRoom = exit.room1Id === otherRoomId;
  const exitType:ExitType = _findExitTypeForModifiers(exit.exitType, modifierTokens);;
  const exitStatus:ExitStatus = _findExitStatusForModifiers(exit.exitType, exit.exitStatus, modifierTokens);
  let {lockableFromRoom1With, lockableFromRoom2With} = exit;
  const lockableFromThisRoomWith = _findLockableWithForModifiers(modifierTokens);
  if (isRoom1OtherRoom) {
    lockableFromRoom2With = lockableFromThisRoomWith;
  } else {
    lockableFromRoom1With = lockableFromThisRoomWith;
  }

  return {...exit, exitType, exitStatus, lockableFromRoom1With, lockableFromRoom2With};
}

function _findSharedWallSectionBetweenRooms(room1Rect:Rect, room2Rect:Rect):Rect|null {
  function _intersectRange(aStart:number, aEnd:number, bStart:number, bEnd:number): [number, number] | null {
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return end > start ? [start, end] : null;
  }

  if (room1Rect.y === room2Rect.y + room2Rect.height) {
    const overlap = _intersectRange(room1Rect.x, room1Rect.x + room1Rect.width, room2Rect.x, room2Rect.x + room2Rect.width);
    if (!overlap) return null;
    return { x: overlap[0], y: room1Rect.y, width: overlap[1] - overlap[0], height: 0 };
  } else if (room2Rect.y === room1Rect.y + room1Rect.height) {
    const overlap = _intersectRange(room1Rect.x, room1Rect.x + room1Rect.width, room2Rect.x, room2Rect.x + room2Rect.width);
    if (!overlap) return null;
    return { x: overlap[0], y: room2Rect.y, width: overlap[1] - overlap[0], height: 0 };
  } else if (room1Rect.x === room2Rect.x + room2Rect.width) {
    const overlap = _intersectRange(room1Rect.y, room1Rect.y + room1Rect.height, room2Rect.y, room2Rect.y + room2Rect.height);
    if (!overlap) return null;
    return { x: room1Rect.x, y: overlap[0], width: 0, height: overlap[1] - overlap[0] };
  } else if (room2Rect.x === room1Rect.x + room1Rect.width) {
    const overlap = _intersectRange(room1Rect.y, room1Rect.y + room1Rect.height, room2Rect.y, room2Rect.y + room2Rect.height);
    if (!overlap) return null;
    return { x: room2Rect.x, y: overlap[0], width: 0, height: overlap[1] - overlap[0] };
  } else {
    return null;
  }
}

function _isSharedWallSectionHorizontal(sharedWallSection:Rect):boolean {
  return (sharedWallSection.width !== 0);
}

function _findExitPositionBetweenRooms(room1Rect:Rect, room2Rect:Rect):{x:number, y:number}|null {
  const sharedWallSection = _findSharedWallSectionBetweenRooms(room1Rect, room2Rect);
  if (!sharedWallSection || _isSharedWallSectionHorizontal(sharedWallSection)) return null;
  return {x:sharedWallSection.x, y:sharedWallSection.y + sharedWallSection.height};
}

function _createNewExit(room:Room, otherRoom:Room, modifierTokens:string[]):RoomExit|null {
  const room1Id = room.id;
  const room2Id = otherRoom.id;
  const result = _findExitPositionBetweenRooms(room.rect, otherRoom.rect);
  if (!result) return null;
  const { x, y } = result;
  const exitType = _findExitTypeForModifiers('doorway', modifierTokens);
  const exitStatus = _findExitStatusForModifiers(exitType, 'open', modifierTokens);
  const lockableFromRoom1With = _findLockableWithForModifiers(modifierTokens);
  const id = createRoomExitId(room1Id, room2Id, x, y);

  return {
    id,
    room1Id,
    room2Id,
    exitType,
    exitStatus,
    lockableFromRoom1With,
    lockableFromRoom2With:null,
    x, y
  }
}

function _addExitToRoomAsNeeded(exitOptionText:string, room:Room, rooms:Room[], errors:ErrorCollector):void {
  const {roomId:otherRoomId, modifierTokens} = _splitExitOption(exitOptionText, errors);
  const otherRoom = findRoom(rooms, otherRoomId);
  if (!otherRoom) {
    errors.addAt(`"${otherRoomId}" room ID must match a defined room.`, ['rooms', room.id], '* exits=', otherRoomId);
    return;
  }
  const existingExit = _findExistingExitBetweenRooms(rooms, room.id, otherRoomId);
  if (existingExit) {
    const updatedExit = _createModifierUpdatedExit(existingExit, otherRoom.id, modifierTokens);
    _replaceRoomPairExit(existingExit, updatedExit, room, otherRoom);
  } else {
    const newExit = _createNewExit(room, otherRoom, modifierTokens);
    if (!newExit) {
      errors.addAt(`"${room.id}" and "${otherRoom.id}" are not horizontally adjacent.`, 
        ['rooms', room.id], '* exits=', otherRoomId);      
      return;
    }
    _addRoomPairExit(newExit, room, otherRoom);
  }
}

function _addExitsToRoom(roomEntry:SectionEntryWithLine, room:Room, rooms:Room[], errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;
  const nameValues = parseUniqueNameValueLines(roomEntry.value, `room "${room.id}"`, true, roomEntry.lineNo);
  const exitsText = nameValues['exits'];
  if (exitsText) {
    const exitOptionTexts = parseOptions(exitsText);
    exitOptionTexts.forEach(t => _addExitToRoomAsNeeded(t, room, rooms, errors));
  }
  return errors.count <= originalErrorCount;
}

export function addExitsToRooms(roomsSectionText:string, rooms:Room[], errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;
  const roomEntries = createNormalizedSectionEntryMap(roomsSectionText, 2, 'rooms', errors); 
  rooms.forEach(room => {
    const roomEntry = roomEntries.get(room.id);
    assertNonNullable(roomEntry);
    _addExitsToRoom(roomEntry, room, rooms, errors);
  });
  return errors.count <= originalErrorCount;
}
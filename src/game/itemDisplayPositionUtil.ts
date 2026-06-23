import Item from "./types/Item";
import Position from "./types/Position";
import Room from "./types/Room";

function _createZeroPosition():Position {
  return { x:0, y:0, z:0 };
}

function _addPositions(position1:Position, position2:Position):Position {
  return {
    x:position1.x + position2.x,
    y:position1.y + position2.y,
    z:position1.z + position2.z
  };
}

function _findItemsSharingStack(room:Room, x:number, z:number):Item[] {
  return room.items.filter(item => item.position.x === x && item.position.z === z);
}

export function findSupportingItemStackOffset(item:Pick<Item, 'id' | 'position'>, room:Room|null):Position {
  if (!room) return _createZeroPosition();

  return _findItemsSharingStack(room, item.position.x, item.position.z)
    .filter(candidate => candidate.id !== item.id && candidate.position.y > item.position.y)
    .reduce((offset, candidate) => _addPositions(offset, candidate.stackOffset), _createZeroPosition());
}

export function findStackOffsetForCharacterPosition(position:Pick<Position, 'x' | 'z'>, room:Room|null):Position {
  if (!room) return _createZeroPosition();

  return _findItemsSharingStack(room, position.x, position.z)
    .reduce((offset, candidate) => _addPositions(offset, candidate.stackOffset), _createZeroPosition());
}

export function findItemDisplayPosition(item:Item, room:Room|null):Position {
  const supportingStackOffset = findSupportingItemStackOffset(item, room);
  return {
    x:item.position.x + supportingStackOffset.x + item.drawOffset.x,
    y:item.position.y + supportingStackOffset.y + item.drawOffset.y,
    z:item.position.z + supportingStackOffset.z + item.drawOffset.z
  };
}
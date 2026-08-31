/* This file calculates ephemeral item and character display positions for room floor-square stacks.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { ITEM_CUBOID_HEIGHT_GAME } from "./itemSizeUtil";
import { findNearestFloorSquareCenter } from "./squareUtil";
import Character from "./types/Character";
import Item from "./types/Item";
import Position from "./types/Position";
import Room from "./types/Room";

type RoomContentDisplayLayoutEntry = {
  displayPosition:Position,
  squarePosition:Position,
  painterOrderAnchor:Position,
  stackMemberI:number
}

export type RoomContentDisplayLayout = {
  itemLayoutById:ReadonlyMap<string, RoomContentDisplayLayoutEntry>,
  characterLayoutById:ReadonlyMap<string, RoomContentDisplayLayoutEntry>,
  findProspectiveItemDisplayPosition:(item:Item, destinationFloorPosition:Position,
    insertionRoomItemI?:number) => Position
}

type SquareLayout = {
  supportTransform:Position,
  painterOrderAnchor:Position|null,
  nextStackMemberI:number
}

function _addPositions(...positions:Position[]):Position {
  return positions.reduce((sum, position) => ({
    x:sum.x + position.x,
    y:sum.y + position.y,
    z:sum.z + position.z
  }), { x:0, y:0, z:0 });
}

function _createSquareKey(position:Pick<Position, 'x'|'z'>):string {
  return `${position.x},${position.z}`;
}

function _getOrCreateSquareLayout(layoutBySquareKey:Map<string, SquareLayout>, squarePosition:Position):SquareLayout {
  const squareKey = _createSquareKey(squarePosition);
  let squareLayout = layoutBySquareKey.get(squareKey);
  if (!squareLayout) {
    squareLayout = { supportTransform:{ x:0, y:0, z:0 }, painterOrderAnchor:null, nextStackMemberI:0 };
    layoutBySquareKey.set(squareKey, squareLayout);
  }
  return squareLayout;
}

function _findSupportTransformBeforeRoomItem(room:Room, squarePosition:Position, insertionRoomItemI:number,
    implicitHeight:Position):Position {
  const squareKey = _createSquareKey(squarePosition);
  return room.items.slice(0, insertionRoomItemI).reduce((supportTransform, item) => {
    if (!item.isVisible || _createSquareKey(item.position) !== squareKey) return supportTransform;
    return _addPositions(supportTransform, item.drawOffset, item.stackOffset, implicitHeight);
  }, { x:0, y:0, z:0 });
}

export function createRoomContentDisplayLayout(room:Room, charactersInRoom:ReadonlyArray<Character>):RoomContentDisplayLayout {
  const itemLayoutById = new Map<string, RoomContentDisplayLayoutEntry>();
  const characterLayoutById = new Map<string, RoomContentDisplayLayoutEntry>();
  const layoutBySquareKey = new Map<string, SquareLayout>();
  const implicitHeight = { x:0, y:-ITEM_CUBOID_HEIGHT_GAME, z:0 };

  room.items.forEach(item => {
    if (!item.isVisible) return;
    const squarePosition = { ...item.position };
    const squareLayout = _getOrCreateSquareLayout(layoutBySquareKey, squarePosition);
    const displayPosition = _addPositions(item.position, squareLayout.supportTransform, item.drawOffset);
    squareLayout.painterOrderAnchor ??= displayPosition;
    itemLayoutById.set(item.id, {
      displayPosition,
      squarePosition,
      painterOrderAnchor:squareLayout.painterOrderAnchor,
      stackMemberI:squareLayout.nextStackMemberI++
    });
    squareLayout.supportTransform = _addPositions(squareLayout.supportTransform, item.drawOffset, item.stackOffset, implicitHeight);
  });

  charactersInRoom.forEach(character => {
    const squarePosition = findNearestFloorSquareCenter(room, character.position);
    const squareLayout = _getOrCreateSquareLayout(layoutBySquareKey, squarePosition);
    const displayPosition = _addPositions(character.position, squareLayout.supportTransform);
    characterLayoutById.set(character.id, {
      displayPosition,
      squarePosition,
      painterOrderAnchor:squareLayout.painterOrderAnchor ?? displayPosition,
      stackMemberI:squareLayout.nextStackMemberI++
    });
  });

  const findProspectiveItemDisplayPosition = (item:Item, destinationFloorPosition:Position,
      insertionRoomItemI?:number):Position => {
    const squareLayout = layoutBySquareKey.get(_createSquareKey(destinationFloorPosition));
    const supportTransform = insertionRoomItemI === undefined
      ? squareLayout?.supportTransform ?? { x:0, y:0, z:0 }
      : _findSupportTransformBeforeRoomItem(room, destinationFloorPosition, insertionRoomItemI, implicitHeight);
    return _addPositions(destinationFloorPosition, supportTransform, item.drawOffset);
  };
  return { itemLayoutById, characterLayoutById, findProspectiveItemDisplayPosition };
}
/* This file calculates ephemeral item and character display positions for room floor-square stacks.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { ITEM_CUBOID_HEIGHT_GAME } from "./itemSizeUtil";
import { findNearestFloorSquareCenter } from "./squareUtil";
import Character from "./types/Character";
import Item from "./types/Item";
import Position from "./types/Position";
import Room from "./types/Room";
import RoomContentDisplayLayout from "./types/RoomContentDisplayLayout";
import RoomContentDisplayLayoutEntry from "./types/RoomContentDisplayLayoutEntry";

type SquareLayout = {
  supportTransform:Position,
  painterOrderAnchor:Position|null,
  nextStackMemberI:number
}

const EMPTY_MOVING_CHARACTER_IDS:ReadonlySet<string> = new Set();

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

export function createRoomContentDisplayLayout(room:Room, charactersInRoom:ReadonlyArray<Character>,
  movingCharacterIds:ReadonlySet<string> = EMPTY_MOVING_CHARACTER_IDS):RoomContentDisplayLayout {
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
    const displayPosition = movingCharacterIds.has(character.id)
      ? character.position : _addPositions(character.position, squareLayout.supportTransform);
    characterLayoutById.set(character.id, {
      displayPosition,
      squarePosition,
      painterOrderAnchor:squareLayout.painterOrderAnchor ?? displayPosition,
      stackMemberI:squareLayout.nextStackMemberI++
    });
  });

  // Transfer effects call this later in the same frame to locate an item without inserting it into the room.
  // The closure keeps stack support private: drop uses the completed stack; take supplies its original
  // room-item index to sum only preceding supports. That path reads captured room.items, which must
  // remain unchanged while this layout is in use. Both paths include the transferred item's draw offset.
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
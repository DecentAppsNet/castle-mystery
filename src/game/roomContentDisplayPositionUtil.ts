/* This module calculates ephemeral item and character display positions for room floor-square stacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { calcItemCuboidHeightGame } from "./itemSizeUtil";
import { findNearestFloorSquareCenter } from "./squareUtil";
import Character from "./types/Character";
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
  characterLayoutById:ReadonlyMap<string, RoomContentDisplayLayoutEntry>
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

export function createRoomContentDisplayLayout(room:Room, charactersInRoom:ReadonlyArray<Character>):RoomContentDisplayLayout {
  const itemLayoutById = new Map<string, RoomContentDisplayLayoutEntry>();
  const characterLayoutById = new Map<string, RoomContentDisplayLayoutEntry>();
  const layoutBySquareKey = new Map<string, SquareLayout>();
  const implicitHeight = { x:0, y:-calcItemCuboidHeightGame(room), z:0 };

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

  return { itemLayoutById, characterLayoutById };
}
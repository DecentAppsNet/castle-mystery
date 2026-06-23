/* This module groups render-time helpers for deriving how characters are visually positioned above item stacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { calcItemCuboidHeightGame } from "./itemSizeUtil";
import { findStackOffsetForCharacterPosition } from "./itemDisplayPositionUtil";
import Character from "./types/Character";
import Position from "./types/Position";
import Room from "./types/Room";

export function findCharacterDisplayPosition(character:Character, room:Room|null):Position {
  if (!room) return { ...character.position };

  let topItemY:number|null = null;
  room.items.forEach(item => {
    if (item.position.x !== character.position.x || item.position.z !== character.position.z) return;
    if (topItemY === null || item.position.y < topItemY) topItemY = item.position.y;
  });
  if (topItemY === null) return { ...character.position };

  const stackOffset = findStackOffsetForCharacterPosition(character.position, room);

  return {
    x:character.position.x + stackOffset.x,
    y:topItemY - calcItemCuboidHeightGame(room) + stackOffset.y,
    z:character.position.z + stackOffset.z
  };
}
/* This module looks up character display positions from an explicitly calculated room-content layout.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { RoomContentDisplayLayout } from "./roomContentDisplayPositionUtil";
import Character from "./types/Character";
import Position from "./types/Position";

export function findCharacterDisplayPosition(character:Character, layout:RoomContentDisplayLayout|null):Position {
  return layout?.characterLayoutById.get(character.id)?.displayPosition ?? { ...character.position };
}
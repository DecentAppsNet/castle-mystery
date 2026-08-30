/* This file derives conservative item-transfer reservations from active character effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import CharacterKeyframe from "@/game/types/CharacterKeyframe";

export function hasActiveDropReservation(characterKeyframe:CharacterKeyframe):boolean {
  return characterKeyframe.effects.some(effect => effect.kind === 'dropItem');
}
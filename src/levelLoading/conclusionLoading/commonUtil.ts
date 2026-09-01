/* This file normalizes conclusion phrases and resolves room-reveal and unlock references.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { parseOptions } from "@/common/markdownUtil";
import { normalizeId } from "@/game/idUtil";
import { findRoomByIdOrTitle } from "@/game/roomUtil";
import Room from "@/game/types/Room";
import { ErrorCollector } from "../errorCollection";


/** Normalizes a category phrase for case-insensitive matching. */
export function normalizeCategoryPhrase(phrase:string):string {
  return phrase.trim().toLowerCase();
}

/** Resolves reveal-room references and reports rooms that are unknown or initially visible. */
export function resolveRevealRoomIds(conclusionName:string, revealRoomsText:string|undefined, 
  rooms:ReadonlyArray<Room>, initiallyObscuredRoomIds:ReadonlySet<string>, errors:ErrorCollector):string[] {
  if (!revealRoomsText) return [];
  const roomIds:string[] = [];
  parseOptions(revealRoomsText).forEach(roomRef => {
    const room = findRoomByIdOrTitle(rooms, roomRef);
    if (room) {
      if (!initiallyObscuredRoomIds.has(room.id)) {
        errors.addAt(`"${roomRef}" is not obscured, so conclusion can't reveal it.`, 
        ['conclusions', conclusionName], `* revealRooms=`, roomRef);
      }
      roomIds.push(room.id);
    } else {
      errors.addAt(`"${roomRef}" doesn't match a defined room.`, 
        ['conclusions', conclusionName], `* revealRooms=`, roomRef);
    }
  });
  return roomIds;
}

/** Resolves unlock references and reports unknown or self-referential conclusions. */
export function resolveUnlockConclusionIds(conclusionName:string, unlockConclusionsText:string|undefined, 
    conclusionIds:string[], errors:ErrorCollector):string[] {
  if (!unlockConclusionsText) return [];
  const conclusionId = normalizeId(conclusionName);
  const unlockConclusionIds:string[] = [];
  parseOptions(unlockConclusionsText).forEach(unlockConclusionName => {
    const unlockConclusionId = normalizeId(unlockConclusionName);
    if (unlockConclusionId === conclusionId) {
      errors.addAt(`Conclusion can't unlock itself.`, ['conclusions', conclusionName], `* unlockConclusions=`, unlockConclusionName);
      return;
    }
    if (!conclusionIds.includes(unlockConclusionId)) {
      errors.addAt(`"${unlockConclusionName}" doesn't match a defined conclusion.`, ['conclusions', conclusionName], `* unlockConclusions=`, unlockConclusionName);
      return;
    }
    unlockConclusionIds.push(unlockConclusionId);
  });
  return unlockConclusionIds;
}
import { parseOptions } from "@/common/markdownUtil";
import { normalizeId } from "@/game/idUtil";
import { findRoomByIdOrTitle } from "@/game/roomUtil";
import Room from "@/game/types/Room";
import { ErrorCollector } from "../errorCollection/errorCollectionApi";


export function normalizeCategoryPhrase(phrase:string):string {
  return phrase.trim().toLowerCase();
}

export function resolveRevealRoomIds(conclusionName:string, revealRoomsText:string|undefined, 
    rooms:ReadonlyArray<Room>, errors:ErrorCollector):string[] {
  if (!revealRoomsText) return [];
  const roomIds:string[] = [];
  parseOptions(revealRoomsText).forEach(roomRef => {
    const room = findRoomByIdOrTitle(rooms, roomRef);
    if (room) {
      if (!room.isObscured) {
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
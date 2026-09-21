/* This file resolves an item's placement within a timeline keyframe for activity scheduling.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import ItemKeyframeLocation from "@/levelLoading/activityLoading/types/ItemKeyframeLocation";

/** Finds an item's current placement in a timeline keyframe. */
export function findItemKeyframeLocation(keyframe:TimelineKeyframe, itemId:string):ItemKeyframeLocation|null {
  for(let roomI = 0; roomI < keyframe.rooms.length; ++roomI) {
    const item = keyframe.rooms[roomI].items.find(candidate => candidate.id === itemId);
    if (item) return { kind:'room', item, roomI };
  }
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    const characterKeyframe = keyframe.characters[characterI];
    if (characterKeyframe.leftHandItem?.id === itemId) {
      return { kind:'leftHand', item:characterKeyframe.leftHandItem, characterI };
    }
    if (characterKeyframe.rightHandItem?.id === itemId) {
      return { kind:'rightHand', item:characterKeyframe.rightHandItem, characterI };
    }
    const item = characterKeyframe.items.find(candidate => candidate.id === itemId);
    if (item) return { kind:'inventory', item, characterI };
  }
  return null;
}
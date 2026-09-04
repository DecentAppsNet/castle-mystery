import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import Item, { duplicateItem } from "@/game/types/Item";
import RoomKeyframe from "@/game/types/RoomKeyframe";
import { addCharacterKeyChanges, addRoomKeyChanges } from "@/levelLoading/timelineLoading";
import { assert, assertNonNullable } from "decent-portal";
import Activity from "../../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { findKeyframeForTime } from "@/game/timeline";

type PartsShape = { characterId?:string, itemId?:string };

function _scheduleCharacterVisibility(characterId:string, isVisible:boolean, activity:Activity, editableTimeline:EditableTimeline):boolean {
  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  assertNonNullable(activity.startTime);
  addCharacterKeyChanges({ isVisible }, characterI, activity.startTime, editableTimeline);
  return true; // Except for debug errors, this function is infallible. Still convenient to coupled caller that it return true.
}

function _findItemInRoomKeyframes(roomKeyframes:RoomKeyframe[], itemId:string):number {
  for(let roomI = 0; roomI < roomKeyframes.length; ++roomI) {
    if (roomKeyframes[roomI].items.find(i => i.id === itemId)) return roomI;
  }
  return -1;
}

function _findItemInCharacterKeyframes(characterKeyframes:CharacterKeyframe[], itemId:string):number {
  for(let characterI = 0; characterI < characterKeyframes.length; ++characterI) {
    const ckf = characterKeyframes[characterI];
    if (ckf.leftHandItem?.id === itemId || ckf.rightHandItem?.id === itemId || ckf.items.find(i => i.id === itemId) !== undefined) return characterI;
  }
  return -1;
}

function _createItemsWithVisibilityChange(items:Item[], itemId:string, isVisible:boolean):Item[] {
  // Avoid an allocation if there is no change to the item.
  const item = items.find(i => i.id === itemId);
  assertNonNullable(item);
  if (item.isVisible === isVisible) return items;

  return items.map(i => {
    if (i.id !== itemId) return i;
    return { ...duplicateItem(i), isVisible };
  });
}

function _createCharacterKeyChangesForVisibility(characterKeyframe:CharacterKeyframe, itemId:string, isVisible:boolean):Partial<CharacterKeyframe> {
  const { leftHandItem, rightHandItem, items } = characterKeyframe;
  if (leftHandItem?.id === itemId) {
    return leftHandItem.isVisible === isVisible 
      ? { leftHandItem } // Avoid allocating new item for non-changing visibility.
      : { leftHandItem: { ...duplicateItem(leftHandItem), isVisible } };
  }
  if (rightHandItem?.id === itemId) {
    return rightHandItem.isVisible === isVisible 
      ? { rightHandItem } // Avoid allocating new item for non-changing visibility.
      : { rightHandItem: { ...duplicateItem(rightHandItem), isVisible } };
  }
  
  assert(items.find(i => i.id === itemId) !== undefined);
  return { items: _createItemsWithVisibilityChange(items, itemId, isVisible) };
}

function _scheduleItemVisibility(itemId:string, isVisible:boolean, activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {  
  // Is the item in a room at activity start?
  assertNonNullable(activity.startTime);
  const keyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const itemRoomI = _findItemInRoomKeyframes(keyframe.rooms, itemId);
  if (itemRoomI !== -1) { // Yes - update room keyframe to include visibility change of item.
    const items = _createItemsWithVisibilityChange(keyframe.rooms[itemRoomI].items, itemId, isVisible);
    addRoomKeyChanges({ items }, itemRoomI, activity.startTime, editableTimeline);
    return true;
  }

  // Is the item on a character?
  const itemCharacterI = _findItemInCharacterKeyframes(keyframe.characters, itemId);
  if (itemCharacterI !== -1) { // Yes -update character keyframe to include visibility change of item.
    const keyChanges = _createCharacterKeyChangesForVisibility(keyframe.characters[itemCharacterI], itemId, isVisible);
    addCharacterKeyChanges(keyChanges, itemCharacterI, activity.startTime, editableTimeline);
    return true;
  }

  // The item is unplaced, which is allowed for supporting the "becomes" activity. But setting visibility while
  // unplaced isn't allowed. Mainly because I don't want to complicate the Timeline data structure to track it.
  const action = isVisible ? 'show' : 'hide';
  errors.addAtLine(`Can't ${action} "${itemId}" item because it isn't placed in a room or on a character.`, activity.lineI);
  return false;
}

export function scheduleVisibilityActivity(isVisible:boolean, activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, itemId } = activity.parts as PartsShape;

  activity.endTime = activity.startTime;
  activity.busyCharacterIds = []; // Even for characters and items on characters, this shouldn't cause a busy state.
  activity.busyItemIds = itemId ? [itemId] : [];

  // The characterId will always be non-null due to implied subject handling. Item must be checked first.
  assertNonNullable(characterId);

  if (itemId) return _scheduleItemVisibility(itemId, isVisible, activity, editableTimeline, errors);
  return _scheduleCharacterVisibility(characterId, isVisible, activity, editableTimeline);
}

import { createKeyframeAtTime } from "@/game/timeline";
import { FacingDirection } from "@/game/types/Character";
import Position from "@/game/types/Position";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { botch } from "decent-portal";

function _findItemPositionInKeyframe(keyframe:TimelineKeyframe, itemId:string):Position {
  for(let roomI = 0; roomI < keyframe.rooms.length; ++roomI) {
    const room = keyframe.rooms[roomI];
    const foundItem = room.items.find(i => i.id === itemId);
    if (foundItem) return foundItem.position;
  }
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    const character = keyframe.characters[characterI];
    if (character.leftHandItem?.id === itemId || character.rightHandItem?.id === itemId) return character.position;
    const foundItem = character.items.find(i => i.id === itemId);
    if (foundItem) return character.position;
  }

  botch(); // Because itemId was earlier checked against allowed IDs when parsing against "faces" parse format, it should be impossible for the item to not be found in a keyframe.
}

export function findCharacterFacingDirection(characterId:string, toCharacterId:string, editableTimeline:EditableTimeline, time:number):FacingDirection {
  const keyframe = createKeyframeAtTime(editableTimeline.keyframes, time);
  const fromCharacterI = editableTimeline.characterIdToI[characterId];
  const toCharacterI = editableTimeline.characterIdToI[toCharacterId];
  const fromPosition = keyframe.characters[fromCharacterI].position;
  const toPosition = keyframe.characters[toCharacterI].position;
  return toPosition.x > fromPosition.x ? 'right' : 'left';
}

export function findItemFacingDirection(characterId:string, toItemId:string,  editableTimeline:EditableTimeline, time:number):FacingDirection {
  const keyframe = createKeyframeAtTime(editableTimeline.keyframes, time);
  const fromCharacterI = editableTimeline.characterIdToI[characterId];
  const fromPosition = keyframe.characters[fromCharacterI].position;
  const toPosition = _findItemPositionInKeyframe(keyframe, toItemId);
  return toPosition.x > fromPosition.x ? 'right' : 'left';
}
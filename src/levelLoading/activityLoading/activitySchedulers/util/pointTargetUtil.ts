/* This file resolves pointing targets and stable world snapshots at activity start without presentation geometry.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from 'decent-portal';
import { createKeyframeAtTimeWithSourceIndex } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';
import { arePositionsEqual } from '@/game/types/Position';
import Level from '@/game/types/Level';
import PointTarget from '@/game/effects/types/PointTarget';
import PointStartSnapshot from '@/game/effects/types/PointStartSnapshot';
import EditableTimeline from '@/levelLoading/timelineLoading/types/EditableTimeline';
import { ErrorCollector } from '@/levelLoading/errorCollection';
import { findItemKeyframeLocation } from './itemKeyframeLocationUtil';

export function resolvePointTarget(level:Level, timeline:EditableTimeline, subjectId:string, target:PointTarget,
    time:number, lineI:number, errors:ErrorCollector):PointStartSnapshot|null {
  const { keyframe, sourceKeyframeI } = createKeyframeAtTimeWithSourceIndex(timeline.keyframes, time);
  const characters = level.characters.map(character =>
    ({ ...character, ...keyframe.characters[timeline.characterIdToI[character.id]] }));
  const subject = characters.find(character => character.id === subjectId);
  assertNonNullable(subject);
  const baseRoom = findRoomAtPosition(level.rooms, subject.position.x, subject.position.y);
  assertNonNullable(baseRoom);
  if (!subject.isVisible) {
    errors.addAtLine(`"${subjectId}" character is unavailable for pointing.`, lineI);
    return null;
  }
  const roomI = timeline.roomIdToI[baseRoom.id];
  const room = { ...baseRoom, ...keyframe.rooms[roomI] };
  const following = timeline.keyframes[sourceKeyframeI + 1];
  const movingCharacterIds = new Set(sourceKeyframeI === 0 || !following ? [] : characters.filter((_, characterI) =>
    !arePositionsEqual(timeline.keyframes[sourceKeyframeI].characters[characterI].position,
      following.characters[characterI].position)).map(character => character.id));
  let resolvedTarget:PointStartSnapshot['target'] = target;

  if (target.kind !== 'direction') {
    const location = target.kind === 'item' ? findItemKeyframeLocation(keyframe, target.itemId) : null;
    const targetCharacter = target.kind === 'character'
      ? characters.find(character => character.id === target.characterId)
      : location && location.kind !== 'room' && location.kind !== 'inventory' ? characters[location.characterI] : null;
    const available = target.kind === 'character' ? targetCharacter?.isVisible
      : location && location.kind !== 'inventory' && location.item.isVisible
        && (location.kind === 'room' || targetCharacter?.isVisible);
    const targetRoom = targetCharacter
      ? findRoomAtPosition(level.rooms, targetCharacter.position.x, targetCharacter.position.y)
      : location?.kind === 'room' ? level.rooms[location.roomI] : null;
    const targetId = target.kind === 'character' ? target.characterId : target.itemId;
    if (!available || targetRoom?.id !== room.id) {
      errors.addAtLine(`Pointing target "${targetId}" is unavailable or not in "${room.id}" room.`, lineI);
      return null;
    }
    if (target.kind === 'item' && targetCharacter) resolvedTarget = { kind:'heldItem', holderId:targetCharacter.id };
  }

  return { subject, room, characters, movingCharacterIds, target:resolvedTarget };
}
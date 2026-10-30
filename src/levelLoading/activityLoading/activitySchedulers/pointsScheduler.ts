/* This file parses pointing activities and creates their effects after complete timeline scheduling.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from 'decent-portal';
import Level from '@/game/types/Level';
import PointTarget from '@/game/effects/types/PointTarget';
import { createPointEffect, getPointDuration } from '@/game/effects/pointEffectUtil';
import EditableTimeline from '@/levelLoading/timelineLoading/types/EditableTimeline';
import { addCharacterEffect } from '@/levelLoading/timelineLoading';
import { ErrorCollector } from '@/levelLoading/errorCollection';
import WaypointGenerationContext from '@/levelLoading/types/WaypointGenerationContext';
import Activity from '../types/Activity';
import { createParseFormat, makeIdentifier, makeLiteralOptions, makeOptions, makeSequence,
  makeVariableLiteralOptions, makeVerb } from '../parseFormatUtil';
import { resolvePointTarget } from './util/pointTargetUtil';

type PointParts = {
  characterId:string,
  direction?:Extract<PointTarget, { kind:'direction' }>['direction'],
  targetCharacterId?:string,
  targetItemId?:string,
  speed?:'quickly'|'slowly'
};

export function createPointsParseFormat() {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const points = makeVerb('points');
  const connector = makeLiteralOptions(['at', 'to'], true);
  const target = makeOptions([
    makeVariableLiteralOptions('direction', ['left', 'right', 'up', 'down', 'upleft', 'upright', 'downleft', 'downright']),
    makeIdentifier('targetCharacterId', 'CharacterId'), makeIdentifier('targetItemId', 'ItemId')
  ]);
  const speed = makeVariableLiteralOptions('speed', ['quickly', 'slowly'], true);
  const rootParseStep = makeSequence([characterId, points, connector, target, speed]);
  return createParseFormat(rootParseStep);
}

export function schedulePointsActivity(_level:Level, _waypoints:WaypointGenerationContext,
    activity:Activity, timeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, speed } = activity.parts as PointParts;
  assertNonNullable(activity.startTime);
  if (timeline.characterIdToI[characterId] === undefined) {
    errors.addAtLine(`"${characterId}" character is not placed in a room, so can't point.`, activity.lineI);
    return false;
  }
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  activity.endTime = activity.startTime + getPointDuration(speed ?? null);
  return true;
}

export function finalizePointEffects(level:Level, activities:readonly Activity[], timeline:EditableTimeline,
    errors:ErrorCollector):boolean {
  for (const activity of activities.filter(candidate => candidate.verb === 'points')) {
    const { characterId, direction, targetCharacterId, targetItemId, speed } = activity.parts as PointParts;
    assertNonNullable(activity.startTime);
    let target:PointTarget;
    if (direction) target = { kind:'direction', direction };
    else if (targetCharacterId) target = { kind:'character', characterId:targetCharacterId };
    else {
      assertNonNullable(targetItemId);
      target = { kind:'item', itemId:targetItemId };
    }
    const snapshot = resolvePointTarget(level, timeline, characterId, target, activity.startTime, activity.lineI, errors);
    if (!snapshot) return false;
    const effect = createPointEffect(activity.startTime, snapshot, speed ?? null);
    if (!effect) {
      errors.addAtLine('Pointing target coincides with the arm pivot.', activity.lineI);
      return false;
    }
    addCharacterEffect(effect, timeline.characterIdToI[characterId], timeline);
  }
  return true;
}
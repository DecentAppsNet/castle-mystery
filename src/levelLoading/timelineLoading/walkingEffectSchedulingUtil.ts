/* This file coalesces recorded travel intervals and attaches walking effects after activity validation.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createWalkEffect } from '@/game/effects/walkEffectUtil';
import { addCharacterEffect } from './editingUtil';
import EditableTimeline from './types/EditableTimeline';
import WalkingInterval from './types/WalkingInterval';

export function scheduleWalkingEffects(timeline:EditableTimeline):void {
  const sorted = [...timeline.pendingWalkingIntervals].sort((first, second) =>
    first.characterI - second.characterI || first.startTime - second.startTime);
  const merged:WalkingInterval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (previous && previous.characterI === interval.characterI && interval.startTime <= previous.endTime) {
      merged[merged.length - 1] = { ...previous, endTime:Math.max(previous.endTime, interval.endTime) };
    } else {
      merged.push(interval);
    }
  }

  for (const { characterI, startTime, endTime } of merged) {
    addCharacterEffect(createWalkEffect(startTime, endTime), characterI, timeline);
  }
}
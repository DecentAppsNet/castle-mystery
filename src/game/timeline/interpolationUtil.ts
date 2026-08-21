/* This module interpolates character positions between timeline keyframes.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/positionUtil";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { assert, assertNonNullable } from "decent-portal";

type CharacterPositionKeyframe = {
  time:number,
  characters:ReadonlyArray<{ position?:Position }>
}

function _interpolatePosition(fromPosition:Position, toPosition:Position, interpolateAmount:number):Position {
  if (interpolateAmount <= 0) return {...fromPosition};
  if (interpolateAmount >= 1) return {...toPosition};
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const dz = toPosition.z - fromPosition.z;
  return {
    x:fromPosition.x + (interpolateAmount * dx),
    y:fromPosition.y + (interpolateAmount * dy),
    z:fromPosition.z + (interpolateAmount * dz)
  };
}

export function findInterpolatedCharacterPosition(fromKeyframe:TimelineKeyframe, toKeyframe:CharacterPositionKeyframe,
    time:number, characterI:number):Position {
  const fromPosition:Position = fromKeyframe.characters[characterI].position;
  const toPosition:Position|null = toKeyframe.characters[characterI].position ?? null;
  if (toPosition === null || arePositionsEqual(fromPosition, toPosition)) return {...fromPosition};
  assertNonNullable(toPosition, 'toKeyframe must have .position defined');
  const fromTime = fromKeyframe.time;
  const toTime = toKeyframe.time;
  if (fromTime === toTime) return {...fromPosition};
  assert(fromTime <= time && toTime >= time);
  assert(fromTime !== toTime);
  const elapsedRatio = (time - fromTime) / (toTime - fromTime);
  return _interpolatePosition(fromPosition, toPosition, elapsedRatio);
}
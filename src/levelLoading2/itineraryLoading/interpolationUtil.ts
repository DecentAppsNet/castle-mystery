import Position from "@/game/types/Position";
import EditableItineraryKeyframe from "./types/EditableItineraryKeyframe";
import ItineraryKeyframe from "./types/ItineraryKeyframe";
import { assert, assertNonNullable } from "decent-portal";
import { interpolatePosition } from "@/game/itineraryUtil";

export function findInterpolatedCharacterPosition(fromKeyframe:ItineraryKeyframe, toKeyframe:EditableItineraryKeyframe, 
    time:number, characterI:number):Position {
  const fromPosition:Position = fromKeyframe.characters[characterI].position;
  const toPosition:Position = toKeyframe.characters[characterI].position!;
  assertNonNullable(toPosition, 'toKeyframe must have .position defined');
  const fromTime = fromKeyframe.time;
  const toTime = toKeyframe.time;
  if (fromTime === toTime) return fromPosition;
  assert(fromTime <= time && toTime >= time);
  assert(fromTime !== toTime);
  const elapsedRatio = (time - fromTime) / (toTime - fromTime);
  return interpolatePosition(fromPosition, toPosition, elapsedRatio);
}
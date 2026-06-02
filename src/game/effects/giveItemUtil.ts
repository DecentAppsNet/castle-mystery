/* This module groups give-item effect creation and drawing helpers for animated item handoffs.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { calcItemDrawMetrics, drawItemAtCanvasPosition, getItemCanvasPosition } from "../drawing/itemDrawUtil";
import Character from "../types/Character";
import Item from "../types/Item";
import { duplicatePosition } from "../types/Position";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import GiveItemEffect from "./types/GiveItemEffect";
import { ITEM_EFFECT_DURATION } from "./dropItemUtil";

function _onProcessRoomEffect(room:Room, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, canDrawEffect:boolean):boolean {
  const giveItemEffect = effect as GiveItemEffect;
  const elapsed = Date.now() - giveItemEffect.startTime;
  if (!canDrawEffect) return elapsed < ITEM_EFFECT_DURATION;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  const position = {
    x:giveItemEffect.startPosition.x + (giveItemEffect.endPosition.x - giveItemEffect.startPosition.x) * progress,
    y:giveItemEffect.startPosition.y + (giveItemEffect.endPosition.y - giveItemEffect.startPosition.y) * progress,
    z:giveItemEffect.startPosition.z + (giveItemEffect.endPosition.z - giveItemEffect.startPosition.z) * progress
  };
  const [x, y] = getItemCanvasPosition({ ...giveItemEffect.item, position }, scalingFactors);
  drawItemAtCanvasPosition(giveItemEffect.item, x, y, calcItemDrawMetrics(room, scalingFactors), context);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createGiveItemEffect(item:Item, room:Room, giver:Character, recipient:Character, time:number, _scalingFactors:ScalingFactors):GiveItemEffect {
  return {
    type:EffectType.GIVE_ITEM,
    room,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startPosition:duplicatePosition({ x:giver.x, y:giver.y, z:giver.depth }),
    endPosition:duplicatePosition({ x:recipient.x, y:recipient.y, z:recipient.depth }),
    onProcessRoomEffect:_onProcessRoomEffect
  };
}
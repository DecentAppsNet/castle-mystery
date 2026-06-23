/* This module groups take-item effect creation and drawing helpers for animated item pickups.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { drawItemAtCanvasPositionInRoom, getItemCanvasPositionInRoom } from "../drawing/itemDrawUtil";
import Character from "../types/Character";
import ImageSet from "../types/ImageSet";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import TakeItemEffect from "./types/TakeItemEffect";
import { ITEM_EFFECT_DURATION } from "./dropItemUtil";

function _drawAnimatedItem(room:Room, takeItemEffect:TakeItemEffect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, imageSet:ImageSet, progress:number) {
  const [x, baseY] = getItemCanvasPositionInRoom(room, takeItemEffect.item, scalingFactors);
  const riseDistancePixels = Math.max(18, scalingFactors.roomFontHeight * 1.5);
  const y = baseY - progress * riseDistancePixels;
  drawItemAtCanvasPositionInRoom(takeItemEffect.item, room, x, y, scalingFactors, context, imageSet);
}

function _onProcessCharacterEffect(_character:Character, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, imageSet:ImageSet):boolean {
  const takeItemEffect = effect as TakeItemEffect;
  const elapsed = Date.now() - takeItemEffect.startTime;
  const room = takeItemEffect.room;
  if (!room) return false;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  _drawAnimatedItem(room, takeItemEffect, context, scalingFactors, imageSet, progress);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createTakeItemEffect(item:Item, character:Character, room:Room, time:number, characterDepth:number):TakeItemEffect {
  return {
    type:EffectType.TAKE_ITEM,
    character,
    room,
    drawsBefore:item.position.z <= characterDepth,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    onProcessCharacterEffect:_onProcessCharacterEffect
  };
}

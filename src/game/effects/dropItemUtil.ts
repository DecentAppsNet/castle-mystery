/* This module groups drop-item effect creation and drawing helpers for animated item drops.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { drawItemAtCanvasPositionInRoom, getItemCanvasPositionInRoom } from "../drawing/itemDrawUtil";
import Character from "../types/Character";
import ImageSet from "../types/ImageSet";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import DropItemEffect from "./types/DropItemEffect";
import EffectType from "./types/EffectType";

export const ITEM_EFFECT_DURATION = 500;

function _onProcessCharacterEffect(_character:Character, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, imageSet:ImageSet):boolean {
  const dropItemEffect = effect as DropItemEffect;
  const elapsed = Date.now() - dropItemEffect.startTime;
  const room = dropItemEffect.room;
  if (!room) return false;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  const [x, endY] = getItemCanvasPositionInRoom(room, dropItemEffect.item, scalingFactors);
  const startYOffsetPixels = Math.max(18, scalingFactors.roomFontHeight * 1.5);
  const y = endY - startYOffsetPixels * (1 - progress);
  drawItemAtCanvasPositionInRoom(dropItemEffect.item, room, x, y, scalingFactors, context, imageSet);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createDropItemEffect(item:Item, character:Character, room:Room, time:number, characterDepth:number):DropItemEffect {
  return {
    type:EffectType.DROP_ITEM,
    character,
    room,
    drawsBefore:item.position.z <= characterDepth,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    onProcessCharacterEffect:_onProcessCharacterEffect
  };
}
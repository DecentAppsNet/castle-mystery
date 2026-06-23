/* This module groups give-item effect creation and drawing helpers for animated item handoffs.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { getCharacterBodyCenterCanvasPosition } from "../drawing/characterDrawUtil";
import { drawItemAtCanvasPositionInRoom, getItemCanvasPosition } from "../drawing/itemDrawUtil";
import Character from "../types/Character";
import ImageSet from "../types/ImageSet";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import GiveItemEffect from "./types/GiveItemEffect";
import { ITEM_EFFECT_DURATION } from "./dropItemUtil";

function _onProcessRoomEffect(room:Room, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, canDrawEffect:boolean, imageSet:ImageSet):boolean {
  const giveItemEffect = effect as GiveItemEffect;
  const elapsed = Date.now() - giveItemEffect.startTime;
  if (!canDrawEffect) return elapsed < ITEM_EFFECT_DURATION;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  const x = giveItemEffect.startCanvasPosition.x + (giveItemEffect.endCanvasPosition.x - giveItemEffect.startCanvasPosition.x) * progress;
  const y = giveItemEffect.startCanvasPosition.y + (giveItemEffect.endCanvasPosition.y - giveItemEffect.startCanvasPosition.y) * progress;
  drawItemAtCanvasPositionInRoom(giveItemEffect.item, room, x, y, scalingFactors, context, imageSet);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createGiveItemEffect(item:Item, room:Room, giver:Character, recipient:Character, time:number, scalingFactors:ScalingFactors):GiveItemEffect {
  const [startCanvasX, startCanvasY] = getItemCanvasPosition({
    ...item,
    position:{ ...giver.position }
  }, scalingFactors);
  const recipientBodyCenter = getCharacterBodyCenterCanvasPosition(recipient, scalingFactors, 0);
  return {
    type:EffectType.GIVE_ITEM,
    room,
    character:recipient,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startCanvasPosition:{ x:startCanvasX, y:startCanvasY },
    endCanvasPosition:{
      x:recipientBodyCenter.x,
      y:recipientBodyCenter.y
    },
    onProcessRoomEffect:_onProcessRoomEffect
  };
}
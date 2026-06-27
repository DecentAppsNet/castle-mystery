/* This module groups give-item effect creation and drawing helpers for animated item handoffs.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { getCharacterBodyCenterCanvasPosition } from "../drawing/characterDrawUtil";
import { drawItemAtCanvasPositionInRoom } from "../drawing/itemDrawUtil";
import Character from "../types/Character";
import ImageSet from "../types/ImageSet";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import GiveItemEffect from "./types/GiveItemEffect";
import { ITEM_EFFECT_DURATION } from "./dropItemUtil";

const GIVE_ITEM_ARC_HEIGHT_WORLD = 2;

function _onProcessRoomEffect(room:Room, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, canDrawEffect:boolean, imageSet:ImageSet, metaTime:number):boolean {
  const giveItemEffect = effect as GiveItemEffect;
  const elapsed = metaTime - giveItemEffect.startTime;
  if (!canDrawEffect) return elapsed < ITEM_EFFECT_DURATION;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  const x = giveItemEffect.startCanvasPosition.x + (giveItemEffect.endCanvasPosition.x - giveItemEffect.startCanvasPosition.x) * progress;
  const arcOffsetY = Math.sin(progress * Math.PI) * GIVE_ITEM_ARC_HEIGHT_WORLD * scalingFactors.scaleY;
  const y = giveItemEffect.startCanvasPosition.y + (giveItemEffect.endCanvasPosition.y - giveItemEffect.startCanvasPosition.y) * progress - arcOffsetY;
  drawItemAtCanvasPositionInRoom(giveItemEffect.item, room, x, y, scalingFactors, context, imageSet);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createGiveItemEffect(item:Item, room:Room, giver:Character, recipient:Character, time:number, scalingFactors:ScalingFactors):GiveItemEffect {
  const giverBodyCenter = getCharacterBodyCenterCanvasPosition(giver, scalingFactors, 0, room);
  const recipientBodyCenter = getCharacterBodyCenterCanvasPosition(recipient, scalingFactors, 0, room);
  return {
    type:EffectType.GIVE_ITEM,
    room,
    character:recipient,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startCanvasPosition:{
      x:giverBodyCenter.x,
      y:giverBodyCenter.y
    },
    endCanvasPosition:{
      x:recipientBodyCenter.x,
      y:recipientBodyCenter.y
    },
    onProcessRoomEffect:_onProcessRoomEffect
  };
}
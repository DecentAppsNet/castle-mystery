/* This file creates animated give-item transfer effects between characters.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp, interpolateNumberPair } from "@/common/numberUtil";
import { drawItemAtCanvasPositionInRoom } from "@/game/drawing/itemDrawUtil";
import { CharacterOwnedItemPlacement, INVENTORY, LEFT_HAND } from "@/game/itemOwnershipUtil";
import Item, { duplicateItem } from "@/game/types/Item";
import ScalingFactors from "@/game/types/ScalingFactors";
import { assertNonNullable } from "decent-portal";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import { EffectHandlerResult } from "./types/EffectHandler";

const GIVE_EFFECT_TIME = 500;

function _handleGive(drawCall:EffectDrawCall, item:Item, sourcePlacement:CharacterOwnedItemPlacement,
    receivingCharacterId:string, startTime:number, endTime:number, scalingFactors:ScalingFactors,
    time:number, context:CanvasRenderingContext2D):EffectHandlerResult|null {
  if (drawCall.stage === 'afterLevel') return null;

  // Resolve both endpoints from current room-local character anatomy.
  const sourceAnatomy = drawCall.characterContext.characterAnatomy;
  const destinationAnatomy = drawCall.characterContext.characterAnatomyById.get(receivingCharacterId);
  assertNonNullable(destinationAnatomy, `missing anatomy for receiving character ${receivingCharacterId}`);
  const source = sourcePlacement === INVENTORY
    ? sourceAnatomy.characterCenterCanvasPoint
    : sourcePlacement === LEFT_HAND
      ? sourceAnatomy.leftHandItemCanvasPoint
      : sourceAnatomy.rightHandItemCanvasPoint;
  const destination = destinationAnatomy.characterCenterCanvasPoint;
  const progress = clamp((time - startTime) / (endTime - startTime), 0, 1);
  const animated = interpolateNumberPair(source, destination, progress);

  // Directly draw inventory items only after the giving character.
  if (sourcePlacement === INVENTORY) {
    if (drawCall.stage === 'beforeCharacter') return null;
    drawItemAtCanvasPositionInRoom(item, animated[0], animated[1], scalingFactors, context,
      drawCall.characterContext.itemTransfer.imageSet);
    return null;
  }

  // Translate the ordinary held-item sprite only before the character is drawn.
  if (drawCall.stage === 'afterCharacter') return null;
  return { spriteOverrides:[{
    spriteKind:sourcePlacement === LEFT_HAND ? 'leftHandItem' : 'rightHandItem',
    transformType:'translateCanvas',
    translateCanvasX:animated[0] - source[0],
    translateCanvasY:animated[1] - source[1]
  }] };
}

/** Creates an item effect that moves from its giver placement to a receiving character's center. */
export function createGiveEffect(item:Item, sourcePlacement:CharacterOwnedItemPlacement,
    receivingCharacterId:string, startTime:number):Effect {
  const endTime = startTime + GIVE_EFFECT_TIME;
  const effectItem = duplicateItem(item);
  return {
    kind:'giveItem',
    startTime,
    endTime,
    handler:(drawCall, scalingFactors, time, _metaTime, context) =>
      _handleGive(drawCall, effectItem, sourcePlacement, receivingCharacterId, startTime, endTime,
        scalingFactors, time, context)
  };
}

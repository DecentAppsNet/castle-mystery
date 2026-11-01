/* This file creates animated take-item transfer effects for hand and inventory destinations.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp, interpolateNumberPair } from "@/common/numberUtil";
import { drawItemAtCanvasPositionInRoom, getItemCanvasPositionInRoom } from "@/game/drawing/itemDrawUtil";
import { CharacterOwnedItemPlacement, INVENTORY, LEFT_HAND } from "@/game/itemOwnershipUtil";
import Item, { duplicateItem } from "@/game/types/Item";
import Position, { duplicatePosition } from "@/game/types/Position";
import ScalingFactors from "@/game/types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import { EffectHandlerResult } from "./types/EffectHandler";
import CharacterAnatomyContext from './types/CharacterAnatomyContext';
import { assertNonNullable } from 'decent-portal';

const TAKE_EFFECT_TIME = 500;

type CharacterDrawCall = Extract<EffectDrawCall, { stage:'beforeCharacter'|'afterCharacter' }>;

function _getSourceCanvasPoint(roomContentDisplayLayout:CharacterAnatomyContext['roomContentDisplayLayout'], item:Item, sourceFloorPosition:Position,
    sourceRoomItemI:number, scalingFactors:ScalingFactors):[number, number] {
  const displayPosition = roomContentDisplayLayout
    .findProspectiveItemDisplayPosition(item, sourceFloorPosition, sourceRoomItemI);
  return getItemCanvasPositionInRoom(displayPosition, scalingFactors);
}

function _handleCharacterTake(drawCall:CharacterDrawCall, item:Item, destinationPlacement:CharacterOwnedItemPlacement,
    sourceFloorPosition:Position, sourceRoomItemI:number, startTime:number, endTime:number,
    scalingFactors:ScalingFactors, time:number, context:CanvasRenderingContext2D):EffectHandlerResult|null {
  const source = _getSourceCanvasPoint(drawCall.characterContext.roomContentDisplayLayout, item, sourceFloorPosition, sourceRoomItemI, scalingFactors);
  const destination = drawCall.characterContext.characterAnatomy.characterCenterCanvasPoint;
  const progress = clamp((time - startTime) / (endTime - startTime), 0, 1);
  const animated = interpolateNumberPair(source, destination, progress);
  if (destinationPlacement === INVENTORY) {
    if (drawCall.stage === 'beforeCharacter') return null;
    drawItemAtCanvasPositionInRoom(item, animated[0], animated[1], scalingFactors, context,
      drawCall.characterContext.imageSet);
    return null;
  }
  return null;
}

function _handleTake(drawCall:EffectDrawCall, item:Item, destinationPlacement:CharacterOwnedItemPlacement,
    sourceFloorPosition:Position, sourceRoomItemI:number, startTime:number, endTime:number,
    scalingFactors:ScalingFactors, time:number, context:CanvasRenderingContext2D):EffectHandlerResult|null {
  if (drawCall.stage === 'beforeCharacter' || drawCall.stage === 'afterCharacter') {
    return _handleCharacterTake(drawCall, item, destinationPlacement, sourceFloorPosition, sourceRoomItemI,
      startTime, endTime, scalingFactors, time, context);
  }
  return null;
}

/** Creates a deferred room-image-center to hand transfer, or the existing draw-only inventory transfer. */
export function createTakeEffect(item:Item, destinationPlacement:CharacterOwnedItemPlacement,
    sourceFloorPosition:Position, sourceRoomItemI:number, startTime:number):Effect {
  const endTime = startTime + TAKE_EFFECT_TIME;
  const effectItem = duplicateItem(item);
  const effectSourcePosition = duplicatePosition(sourceFloorPosition);
  return {
    kind:'takeItem',
    startTime,
    endTime,
    anatomyHandler:destinationPlacement === INVENTORY ? null : (context, time) => {
      if (time < startTime || time > endTime) return [];
      const centerOffset = context.roomItemCenterOffsetById.get(effectItem.id);
      assertNonNullable(centerOffset, `Missing room image center offset for held item ${effectItem.id}`);
      const source = _getSourceCanvasPoint(context.roomContentDisplayLayout, effectItem, effectSourcePosition, sourceRoomItemI, context.scalingFactors);
      return [{
        spriteKind:destinationPlacement === LEFT_HAND ? context.leftHandPartKind
          : context.leftHandPartKind === 'nearHand' ? 'farHand' : 'nearHand',
        transformType:'deferredHandDisplacement',
        destinationCanvasPoint:[source[0] + centerOffset[0], source[1] + centerOffset[1]],
        weight:1 - clamp((time - startTime) / (endTime - startTime), 0, 1)
      }];
    },
    drawHandler:destinationPlacement !== INVENTORY ? null : (drawCall, scalingFactors, time, _metaTime, context) =>
      _handleTake(drawCall, effectItem, destinationPlacement, effectSourcePosition, sourceRoomItemI,
        startTime, endTime, scalingFactors, time, context)
  }
}
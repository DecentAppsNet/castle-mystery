/* This file creates drop-item transfer effects for hand-held and inventory items.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp, interpolateNumberPair } from "@/common/numberUtil";
import { drawItemAtCanvasPositionInRoom, getItemCanvasPositionInRoom } from "@/game/drawing/itemDrawUtil";
import { CharacterOwnedItemPlacement, INVENTORY, LEFT_HAND } from "@/game/itemOwnershipUtil";
import Item, { duplicateItem } from "@/game/types/Item";
import Position from "@/game/types/Position";
import ScalingFactors from "@/game/types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import CharacterAnatomyContext from './types/CharacterAnatomyContext';
import { assertNonNullable } from 'decent-portal';

const DROP_EFFECT_TIME = 500;

type CharacterDrawCall = Extract<EffectDrawCall, { stage:'beforeCharacter'|'afterCharacter' }>;
function _getDestinationCanvasPoint(roomContentDisplayLayout:CharacterAnatomyContext['roomContentDisplayLayout'], item:Item, destinationFloorPosition:Position,
    scalingFactors:ScalingFactors):[number, number] {
  const displayPosition = roomContentDisplayLayout
    .findProspectiveItemDisplayPosition(item, destinationFloorPosition);
  return getItemCanvasPositionInRoom(displayPosition, scalingFactors);
}

function _handleCharacterDrop(drawCall:CharacterDrawCall, item:Item, sourcePlacement:CharacterOwnedItemPlacement,
    destinationFloorPosition:Position, startTime:number, endTime:number,
  scalingFactors:ScalingFactors, time:number,
    context:CanvasRenderingContext2D):void {
  const characterContext = drawCall.characterContext;
  const anatomy = drawCall.characterContext.characterAnatomy;
  const destination = _getDestinationCanvasPoint(characterContext.roomContentDisplayLayout, item, destinationFloorPosition, scalingFactors);
  const progress = clamp((time - startTime) / (endTime - startTime), 0, 1);
  if (sourcePlacement === INVENTORY) {
    if (drawCall.stage === 'beforeCharacter') return;
    const [x, y] = interpolateNumberPair(anatomy.characterCenterCanvasPoint, destination, progress);
    drawItemAtCanvasPositionInRoom(item, x, y, scalingFactors, context, characterContext.imageSet);
  }
}

function _handleDrop(drawCall:EffectDrawCall, item:Item, sourcePlacement:CharacterOwnedItemPlacement,
    destinationFloorPosition:Position, startTime:number, endTime:number, scalingFactors:ScalingFactors,
    time:number, context:CanvasRenderingContext2D):void {
  if (drawCall.stage === 'beforeCharacter' || drawCall.stage === 'afterCharacter') {
    return _handleCharacterDrop(drawCall, item, sourcePlacement, destinationFloorPosition, startTime,
      endTime, scalingFactors, time, context);
  }
}

/** Creates a deferred hand transfer or the existing draw-only inventory transfer to a room destination. */
export function createDropEffect(item:Item, sourcePlacement:CharacterOwnedItemPlacement,
    destinationFloorPosition:Position, startTime:number):Effect {
  const endTime = startTime + DROP_EFFECT_TIME;
  const effectItem = duplicateItem(item);
  const effectDestination = { ...destinationFloorPosition };
  return {
    kind:'dropItem',
    startTime,
    endTime,
    anatomyHandler:sourcePlacement === INVENTORY ? null : (context, time) => {
      if (time < startTime || time > endTime) return [];
      const centerOffset = context.roomItemCenterOffsetById.get(effectItem.id);
      assertNonNullable(centerOffset, `Missing room image center offset for held item ${effectItem.id}`);
      const destination = _getDestinationCanvasPoint(context.roomContentDisplayLayout, effectItem, effectDestination, context.scalingFactors);
      return [{
        spriteKind:sourcePlacement === LEFT_HAND ? context.leftHandPartKind
          : context.leftHandPartKind === 'nearHand' ? 'farHand' : 'nearHand',
        transformType:'deferredHandDisplacement',
        destinationCanvasPoint:[destination[0] + centerOffset[0], destination[1] + centerOffset[1]],
        weight:clamp((time - startTime) / (endTime - startTime), 0, 1)
      }];
    },
    drawHandler:sourcePlacement !== INVENTORY ? null : (drawCall, scalingFactors, time, _metaTime, context) =>
      _handleDrop(drawCall, effectItem, sourcePlacement, effectDestination, startTime, endTime,
        scalingFactors, time, context)
  }
}
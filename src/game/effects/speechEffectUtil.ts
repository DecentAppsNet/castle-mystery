/* This file creates and draws speech, thought, and emitted-text character effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";
import { createEmitBubbleAnchorAtTopCenter, drawEmitBubble, drawEmitBubbleNearExit, drawSpeechBubble,
  drawSpeechBubbleNearExit, drawThoughtBubble } from "../drawing/characters/characterBubbleDrawUtil";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import EffectHandler, { EffectHandlerResult } from "./types/EffectHandler";
import { rand } from "@/common/randUtil";
import SpriteOverride from "./types/SpriteOverride";

export type TalkingDip = Readonly<{
  startTimeOffset:number,
  peakAngleOffsetRadians:number,
  returnDurationMsecs:number
}>;

const SMALL_DIP_ANGLE_RADIANS = Math.PI / 180;
const LARGE_DIP_ANGLE_RADIANS = Math.PI / 90;
const SMALL_DIP_DURATION_MSECS = 100;
const LARGE_DIP_DURATION_MSECS = 200;
const MIN_GAP_DURATION_MSECS = 20;
const MAX_GAP_DURATION_MSECS = 140;
const THINKING_ANGLE_RADIANS = Math.PI / 12;
const THINKING_LOOK_DOWN_DURATION_MSECS = 200;
const THINKING_LOOK_UP_DURATION_MSECS = 200;

let theTalkingDips:TalkingDip[]|null = null;
const TALKING_DIPS_DURATION = 60000; // Set pretty high for less chance of animations looking similar between two characters talking at same time.

function _createTalkingDips(duration:number):TalkingDip[] {
  assert(duration > 0);
  const dips:TalkingDip[] = [];
  let timeOffset = 0;
  while (timeOffset < duration) {
    const isLargeDip = rand() < 0.35;
    const returnDurationMsecs = isLargeDip ? LARGE_DIP_DURATION_MSECS : SMALL_DIP_DURATION_MSECS;
    dips.push({
      startTimeOffset:timeOffset,
      peakAngleOffsetRadians:isLargeDip ? LARGE_DIP_ANGLE_RADIANS : SMALL_DIP_ANGLE_RADIANS,
      returnDurationMsecs
    });
    const gapDuration = MIN_GAP_DURATION_MSECS + Math.floor(rand() * (MAX_GAP_DURATION_MSECS - MIN_GAP_DURATION_MSECS + 1));
    timeOffset += returnDurationMsecs + gapDuration;
  }

  return dips;
}

// Returns populated singleton.
function _getOrCreateTalkingDips():TalkingDip[] {
  if (!theTalkingDips) theTalkingDips = _createTalkingDips(TALKING_DIPS_DURATION);
  return theTalkingDips;
}

function _calcSpeakingHeadRotationResult(time:number, effectStartTime:number, dipOffset:number):EffectHandlerResult {
  const dipPosition = ((time - effectStartTime) + dipOffset) % TALKING_DIPS_DURATION;
  const dips = _getOrCreateTalkingDips();
  assert(dipPosition >= 0 && dipPosition < TALKING_DIPS_DURATION);
  assert(dips.length > 0);

  let headRotationOffsetRadians = 0;
  for (let dipI = dips.length - 1; dipI >= 0; --dipI) {
    const dip = dips[dipI];
    if (dipPosition < dip.startTimeOffset) continue;
    const dipElapsedTime = dipPosition - dip.startTimeOffset;
    if (dipElapsedTime <= dip.returnDurationMsecs) {
      headRotationOffsetRadians = dip.peakAngleOffsetRadians * (1 - dipElapsedTime / dip.returnDurationMsecs);
    }
    break;
  }

  const rotationOverride:SpriteOverride = {
    spriteKind:'head',
    transformType:'rotate',
    rotateRadians:headRotationOffsetRadians
  }
  return { spriteOverrides:[rotationOverride] };
}

function _calcThinkingHeadRotationResult(time:number, effectStartTime:number, effectDuration:number):EffectHandlerResult {
  const animationDuration = THINKING_LOOK_DOWN_DURATION_MSECS + THINKING_LOOK_UP_DURATION_MSECS;
  const durationScale = Math.min(1, Math.max(0, effectDuration) / animationDuration);
  const lookDownDuration = THINKING_LOOK_DOWN_DURATION_MSECS * durationScale;
  const lookUpDuration = THINKING_LOOK_UP_DURATION_MSECS * durationScale;
  const elapsedTime = time - effectStartTime;
  let angleOffsetRadians = 0;
  if (lookDownDuration > 0 && elapsedTime >= 0 && elapsedTime < lookDownDuration) {
    angleOffsetRadians = THINKING_ANGLE_RADIANS * elapsedTime / lookDownDuration;
  } else if (lookUpDuration > 0 && elapsedTime >= effectDuration - lookUpDuration && elapsedTime < effectDuration) {
    angleOffsetRadians = THINKING_ANGLE_RADIANS * (effectDuration - elapsedTime) / lookUpDuration;
  } else if (elapsedTime >= lookDownDuration && elapsedTime < effectDuration - lookUpDuration) {
    angleOffsetRadians = THINKING_ANGLE_RADIANS;
  }
  return { spriteOverrides:[{
    spriteKind:'head', transformType:'rotate', rotateRadians:angleOffsetRadians
  }] };
}

function _saysHandler(drawCall: EffectDrawCall, scalingFactors: ScalingFactors, time: number, context: CanvasRenderingContext2D, text: string, 
  startTime: number, dipOffset: number, characterId:string):EffectHandlerResult|null {
  if (drawCall.stage === 'beforeCharacter') return _calcSpeakingHeadRotationResult(time, startTime, dipOffset);
  if (drawCall.stage === 'afterCharacter') {
    const { anchorX, anchorTopY, isCharacterInActiveRoom, isLevelComplete } = drawCall.characterContext;
    if (isCharacterInActiveRoom || isLevelComplete) {
      drawSpeechBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time);
    }
    return null;
  }
  const { characterLocationById, isLevelComplete } = drawCall.levelContext;
  const location = characterLocationById.get(characterId);
  if (!isLevelComplete && location?.kind === 'adjacentOpenExit') {
    drawSpeechBubbleNearExit(text, location.exitTargetCanvasPoint, location.activeRoomInteriorCanvasPoint,
      scalingFactors, context, startTime, time);
  }
  return null;
}

function _thinksHandler(drawCall: EffectDrawCall, scalingFactors: ScalingFactors, time: number, context: CanvasRenderingContext2D, text: string, 
  startTime: number, speechDuration:number):EffectHandlerResult|null {
  if (drawCall.stage === 'beforeCharacter') return _calcThinkingHeadRotationResult(time, startTime, speechDuration);
  if (drawCall.stage !== 'afterCharacter') return null;

  // afterCharacter draw stage
  const { anchorX, anchorTopY } = drawCall.characterContext;
  drawThoughtBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time);
  return null;
}

function _emitsHandler(drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number,
  context:CanvasRenderingContext2D, text:string, startTime:number, isLoud:boolean, characterId:string):EffectHandlerResult|null {
  if (drawCall.stage === 'afterCharacter') {
    const { anchorX, anchorTopY, isCharacterInActiveRoom, isLevelComplete } = drawCall.characterContext;
    if (isCharacterInActiveRoom || isLevelComplete) {
      drawEmitBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time);
    }
    return null;
  }
  
  if (drawCall.stage !== 'afterLevel') return null;
  const { characterLocationById, isLevelComplete, activeRoomTopCenterCanvasPoint } = drawCall.levelContext;
  const location = characterLocationById.get(characterId);
  if (location?.kind === 'activeRoom' || isLevelComplete) return null;
  if (isLoud) {
    const { anchorX, anchorTopY } = createEmitBubbleAnchorAtTopCenter(activeRoomTopCenterCanvasPoint, scalingFactors);
    drawEmitBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time);
  } else if (location?.kind === 'adjacentOpenExit') {
    drawEmitBubbleNearExit(text, location.exitTargetCanvasPoint, location.activeRoomInteriorCanvasPoint,
      scalingFactors, context, startTime, time);
  }
  return null;
}

export function createSaysEffect(characterId:string, text:string, startTime:number, speechDuration:number):Effect {
  const dipOffset = rand() * TALKING_DIPS_DURATION; // Set this randomly so that characters rarely have same head animation.
  const handler:EffectHandler = (drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number, _metaTime:number, context:CanvasRenderingContext2D) => {
    return _saysHandler(drawCall, scalingFactors, time, context, text, startTime, dipOffset, characterId);
  }
  return { kind:'says', startTime, endTime:startTime+speechDuration, handler };
}

export function createThinksEffect(text:string, startTime:number, speechDuration:number):Effect {
  const handler:EffectHandler = (drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number, _metaTime:number, context:CanvasRenderingContext2D) => {
    return _thinksHandler(drawCall, scalingFactors, time, context, text, startTime, speechDuration);
  }
  return { kind:'thinks', startTime, endTime:startTime+speechDuration, handler };
}

export function createEmitsEffect(characterId:string, text:string, startTime:number, speechDuration:number, isLoud:boolean):Effect {
  const handler:EffectHandler = (drawCall, scalingFactors, time, _metaTime, context) =>
    _emitsHandler(drawCall, scalingFactors, time, context, text, startTime, isLoud, characterId);
  return { kind:'emits', startTime, endTime:startTime+speechDuration, handler };
}
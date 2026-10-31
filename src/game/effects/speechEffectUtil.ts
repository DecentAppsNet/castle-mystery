/* This file creates and draws speech, thought, and emitted-text character effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createEmitBubbleAnchorAtTopCenter, drawEmitBubble, drawEmitBubbleNearExit, drawSpeechBubble,
  drawSpeechBubbleNearExit, drawThoughtBubble } from "../drawing/characters/characterBubbleDrawUtil";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import EffectHandler, { EffectHandlerResult } from "./types/EffectHandler";
import EmitSource from "./types/EmitSource";
import FramePresentationIndex from "./types/FramePresentationIndex";
import CanvasBubbleAnchor from "./types/CanvasBubbleAnchor";
import LevelEffectDrawContext from "./types/LevelEffectDrawContext";
import LevelEffectCharacterLocation from "./types/LevelEffectCharacterLocation";
import { findEmitTipDirection } from "./emitDirectionUtil";
import { FacingDirection } from "../types/Character";
import { isSpeechAudible, isThoughtObservable } from "./speechObservabilityPolicy";
import { PreparedAnimationText } from "@/game/textAnimations/types/PreparedAnimationText";
import { createTalkingGestureSampler } from "./talkingGestureUtil";
import TalkingGestureSampler from "./types/TalkingGestureSampler";
import { createTalkingDipSampler } from "./talkingDipUtil";
import TalkingDipSampler from "./types/TalkingDipSampler";

const THINKING_ANGLE_RADIANS = Math.PI / 12;
const THINKING_LOOK_DOWN_DURATION_MSECS = 200;
const THINKING_LOOK_UP_DURATION_MSECS = 200;

function _calcThinkingHeadRotationResult(time:number, effectStartTime:number, effectDuration:number,
  facingDirection:FacingDirection):EffectHandlerResult {
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
  if (facingDirection === 'left') angleOffsetRadians *= -1;
  return { spriteOverrides:[{
    spriteKind:'head', transformType:'rotate', rotateRadians:angleOffsetRadians
  }] };
}

function _saysHandler(drawCall: EffectDrawCall, scalingFactors: ScalingFactors, time: number, context: CanvasRenderingContext2D, text: PreparedAnimationText,
  startTime: number, sampleDips:TalkingDipSampler, characterId:string, metaTime:number,
  sampleGestures:TalkingGestureSampler):EffectHandlerResult|null {
  if (drawCall.stage === 'beforeCharacter') {
    return { spriteOverrides:[...sampleDips(time - startTime), ...sampleGestures(time - startTime)] };
  }
  if (drawCall.stage === 'characterAfterLevel') {
    const { characterAnatomy:{ anchorX, anchorTopY }, isCharacterInActiveRoom, isLevelComplete } = drawCall.characterContext;
    if (isCharacterInActiveRoom || isLevelComplete) {
      drawSpeechBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time, metaTime);
    }
    return null;
  }
  if (drawCall.stage === 'afterLevel') {
    const { characterLocationById, isActiveRoomObscured, isLevelComplete } = drawCall.levelContext;
    const location = characterLocationById.get(characterId);
    const isAudible = isSpeechAudible(isActiveRoomObscured, isLevelComplete);
    if (!isLevelComplete && isAudible && location?.kind === 'adjacentOpenExit') {
      drawSpeechBubbleNearExit(text, location.exitTargetCanvasPoint, location.activeRoomInteriorCanvasPoint,
        scalingFactors, context, startTime, time, metaTime);
    }
  }
  return null;
}

function _thinksHandler(drawCall: EffectDrawCall, scalingFactors: ScalingFactors, time: number, context: CanvasRenderingContext2D, text: PreparedAnimationText,
  startTime: number, speechDuration:number, facingDirection:FacingDirection, metaTime:number):EffectHandlerResult|null {
  if (drawCall.stage === 'beforeCharacter') {
    return _calcThinkingHeadRotationResult(time, startTime, speechDuration, facingDirection);
  }
  if (drawCall.stage === 'characterAfterLevel') {
    const { characterAnatomy:{ anchorX, anchorTopY }, isActiveCharacter, isLevelComplete } = drawCall.characterContext;
    if (isThoughtObservable(isActiveCharacter, isLevelComplete)) {
      drawThoughtBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time, metaTime);
    }
  }
  return null;
}

function _findEmitSourceAnchor(source:EmitSource,
    framePresentationIndex:FramePresentationIndex):CanvasBubbleAnchor|null {
  return source.kind === 'character'
    ? framePresentationIndex.characterBubbleAnchorById.get(source.characterId) ?? null
    : framePresentationIndex.itemBubbleAnchorById.get(source.itemId) ?? null;
}

function _findEmitSourceLocation(source:EmitSource,
    levelContext:LevelEffectDrawContext):LevelEffectCharacterLocation|null {
  if (source.kind === 'floorItem') return levelContext.roomLocationById.get(source.roomId) ?? null;
  const characterId = source.kind === 'character' ? source.characterId : source.ownerCharacterId;
  return levelContext.characterLocationById.get(characterId) ?? null;
}

function _emitsHandler(drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number,
  context:CanvasRenderingContext2D, text:PreparedAnimationText, startTime:number, isLoud:boolean,
  source:EmitSource, metaTime:number):EffectHandlerResult|null {
  if (drawCall.stage !== 'afterLevel') return null;
  const levelContext = drawCall.levelContext;
  if (!isSpeechAudible(levelContext.isActiveRoomObscured, levelContext.isLevelComplete)) return null;
  const anchor = _findEmitSourceAnchor(source, levelContext.framePresentationIndex);
  if (anchor) {
    drawEmitBubble(text, anchor.anchorX, anchor.anchorTopY, scalingFactors, context, startTime, time, metaTime);
    return null;
  }

  const location = _findEmitSourceLocation(source, levelContext);
  if (isLoud) {
    const tipDirection = location?.roomId && location.roomRect
      ? findEmitTipDirection(levelContext.activeRoomId, levelContext.activeRoomRect,
          location.roomId, location.roomRect)
      : null;
    const { anchorX, anchorTopY } = createEmitBubbleAnchorAtTopCenter(
      levelContext.activeRoomTopCenterCanvasPoint, scalingFactors);
    drawEmitBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time, metaTime, tipDirection);
    return null;
  }

  if (location?.kind === 'adjacentOpenExit') {
    drawEmitBubbleNearExit(text, location.exitTargetCanvasPoint, location.activeRoomInteriorCanvasPoint,
      scalingFactors, context, startTime, time, metaTime);
  }
  return null;
}

export function createSaysEffect(characterId:string, text:PreparedAnimationText, startTime:number, speechDuration:number):Effect {
  const sampleDips = createTalkingDipSampler();
  const sampleGestures = createTalkingGestureSampler(speechDuration);
  const handler:EffectHandler = (drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number, metaTime:number, context:CanvasRenderingContext2D) => {
    return _saysHandler(drawCall, scalingFactors, time, context, text, startTime, sampleDips, characterId, metaTime, sampleGestures);
  }
  return { kind:'says', startTime, endTime:startTime+speechDuration, handler };
}

export function createThinksEffect(text:PreparedAnimationText, startTime:number, speechDuration:number,
    facingDirection:FacingDirection):Effect {
  const handler:EffectHandler = (drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number, metaTime:number, context:CanvasRenderingContext2D) => {
    return _thinksHandler(drawCall, scalingFactors, time, context, text, startTime, speechDuration, facingDirection, metaTime);
  }
  return { kind:'thinks', startTime, endTime:startTime+speechDuration, handler };
}

export function createEmitsEffect(source:EmitSource, text:PreparedAnimationText, startTime:number, speechDuration:number, isLoud:boolean):Effect {
  const handler:EffectHandler = (drawCall, scalingFactors, time, metaTime, context) =>
    _emitsHandler(drawCall, scalingFactors, time, context, text, startTime, isLoud, source, metaTime);
  return { kind:'emits', startTime, endTime:startTime+speechDuration, handler };
}
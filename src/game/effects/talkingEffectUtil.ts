/* This module groups talking-effect creation and head-angle helpers for speech animation.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "@/game/types/Character";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import TalkingEffect, { TalkingDip } from "./types/TalkingEffect";

const SMALL_DIP_ANGLE_RADIANS = Math.PI / 180;
const LARGE_DIP_ANGLE_RADIANS = Math.PI / 90;
const SMALL_DIP_DURATION_MSECS = 100;
const LARGE_DIP_DURATION_MSECS = 200;
const MIN_GAP_DURATION_MSECS = 20;
const MAX_GAP_DURATION_MSECS = 140;
const RANDOM_MODULUS = 0x7fffffff;
const RANDOM_MULTIPLIER = 48271;

function _hashSpeechSeed(character:Character, speechStartTime:number, speechEndTime:number):number {
  const seed = Math.trunc(character.randomSalt) + speechStartTime * 31 + speechEndTime * 17 + character.id.length * 13;
  return Math.abs(seed) % RANDOM_MODULUS || 1;
}

function _createSeededRandom(seed:number):() => number {
  let current = seed;
  return () => {
    current = (current * RANDOM_MULTIPLIER) % RANDOM_MODULUS;
    return current / RANDOM_MODULUS;
  };
}

function _createTalkingDips(character:Character, speechStartTime:number, speechEndTime:number):TalkingDip[] {
  const speechDuration = Math.max(0, speechEndTime - speechStartTime);
  if (speechDuration <= 0) return [];
  const random = _createSeededRandom(_hashSpeechSeed(character, speechStartTime, speechEndTime));
  const dips:TalkingDip[] = [];
  let timeOffset = 0;

  while (timeOffset < speechDuration) {
    const isLargeDip = random() < 0.35;
    const returnDurationMsecs = isLargeDip ? LARGE_DIP_DURATION_MSECS : SMALL_DIP_DURATION_MSECS;
    dips.push({
      startTimeOffset:timeOffset,
      peakAngleOffsetRadians:isLargeDip ? LARGE_DIP_ANGLE_RADIANS : SMALL_DIP_ANGLE_RADIANS,
      returnDurationMsecs
    });
    const gapDuration = MIN_GAP_DURATION_MSECS + Math.floor(random() * (MAX_GAP_DURATION_MSECS - MIN_GAP_DURATION_MSECS + 1));
    timeOffset += returnDurationMsecs + gapDuration;
  }

  return dips;
}

function _onProcessLevelEffect(effect:Effect, _context:CanvasRenderingContext2D):boolean {
  const talkingEffect = effect as TalkingEffect;
  return talkingEffect.gameTime < talkingEffect.speechEndTime;
}

export function createTalkingEffect(character:Character, speechStartTime:number, speechEndTime:number, gameTime:number):TalkingEffect {
  return {
    type:EffectType.TALKING,
    character,
    speechStartTime,
    speechEndTime,
    gameTime,
    dips:_createTalkingDips(character, speechStartTime, speechEndTime),
    startTime:Date.now(),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}

export function calcTalkingAngleOffsetRadians(talkingEffect:TalkingEffect, gameTime:number):number {
  const speechElapsedTime = gameTime - talkingEffect.speechStartTime;
  if (speechElapsedTime < 0 || gameTime >= talkingEffect.speechEndTime) return 0;
  for (let i = talkingEffect.dips.length - 1; i >= 0; --i) {
    const dip = talkingEffect.dips[i];
    if (speechElapsedTime < dip.startTimeOffset) continue;
    const dipElapsedTime = speechElapsedTime - dip.startTimeOffset;
    if (dipElapsedTime > dip.returnDurationMsecs) return 0;
    return dip.peakAngleOffsetRadians * (1 - dipElapsedTime / dip.returnDurationMsecs);
  }
  return 0;
}
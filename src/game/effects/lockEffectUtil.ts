import Position from "../types/Position";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import EffectHandler from "./types/EffectHandler";

const LOCK_UNLOCK_DURATION = 500;

function _locksHandler(_drawCall:EffectDrawCall, _scalingFactors:ScalingFactors, _time:number, _context:CanvasRenderingContext2D, _exitPosition:Position, _startTime:number) {

}

function _unlocksHandler(_drawCall:EffectDrawCall, _scalingFactors:ScalingFactors, _time:number, _context:CanvasRenderingContext2D, _exitPosition:Position, _startTime:number) {

}

export function createLockEffect(exitPosition:Position, startTime:number):Effect {
   const handler:EffectHandler = (drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number, _metaTime:number, context:CanvasRenderingContext2D) => {
    _locksHandler(drawCall, scalingFactors, time, context, exitPosition, startTime);
    return null;
  }
  return { kind:'lockExit', startTime, endTime:startTime+LOCK_UNLOCK_DURATION, handler };
}

export function createUnlockEffect(exitPosition:Position, startTime:number):Effect {
   const handler:EffectHandler = (drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number, _metaTime:number, context:CanvasRenderingContext2D) => {
    _unlocksHandler(drawCall, scalingFactors, time, context, exitPosition, startTime);
    return null;
  }
  return { kind:'unlockExit', startTime, endTime:startTime+LOCK_UNLOCK_DURATION, handler };
}
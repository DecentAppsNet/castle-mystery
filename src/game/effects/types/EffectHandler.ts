import ScalingFactors from "@/game/types/ScalingFactors";
import EffectDrawCall from "./EffectDrawCall";

/**
 * The effect handler's parameters should be limited to values that can't be learned and curried at effect creation time.
 *
 * @param drawCall Identifies drawing stage and contains values specific to that drawing stage.
 * @param scalingFactors Converts game-unit coordinates to canvas pixels and may change on any animation frame.
 * @param time Timeline time, which can be paused or rewound.
 * @param metaTime Player-experience time, which always moves forward.
 * @param context Canvas to draw to.
 * 
 * @returns No value; anatomy contributions belong in the separate anatomy handler.
 */
type EffectHandler = (
    drawCall:EffectDrawCall,
    scalingFactors:ScalingFactors,
    time:number,
    metaTime:number,
    context:CanvasRenderingContext2D)
  => void;

export default EffectHandler;
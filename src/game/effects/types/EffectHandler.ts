import ScalingFactors from "@/game/types/ScalingFactors";
import SpriteOverride from "./SpriteOverride";
import EffectDrawCall from "./EffectDrawCall";

export type EffectHandlerResult = {
  spriteOverrides:SpriteOverride[]
}

/**
 * The effect handler's parameters should be limited to values that can't be learned and curried at effect creation time.
 *
 * @param drawCall Identifies drawing stage and contains values specific to that drawing stage.
 * @param scalingFactors Converts game-unit coordinates to canvas pixels and may change on any animation frame.
 * @param time Timeline time, which can be paused or rewound.
 * @param metaTime Player-experience time, which always moves forward.
 * @param context Canvas to draw to.
 * 
 * @returns Optionally, the handler can return EffectHandlerResults to influence how calling code draws things. It is
 *          preferable for the handler to directly draw an effect, but if the calling code is already drawing a sprite or 
 *          other element, this return value can be used to apply transformations or other tweaks to that drawing.
 */
type EffectHandler = (
    drawCall:EffectDrawCall,
    scalingFactors:ScalingFactors,
    time:number,
    metaTime:number,
    context:CanvasRenderingContext2D)
  => EffectHandlerResult|null;

export default EffectHandler;
import EffectDrawStage from "./EffectDrawStage";
import ScalingFactors from "@/game/types/ScalingFactors";

type SpriteOverride = {
  spriteKind:'leftHandItem'|'rightHandItem'|'head',
  transformType:'translate'|'rotate'|'scale',
  transformX:number|null,
  transformY:number|null,
  transformZ:number|null
}

export type EffectHandlerResult = {
  spriteOverrides:SpriteOverride[]
}

/**
 * The effect handler's parameters should be limited to values that can't be learned and curried at effect creation time.
 *
 * @param drawStage At what stage of drawing the effect handler is called. The handler only acts on stages relevant to it.
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
    drawStage:EffectDrawStage,
    scalingFactors:ScalingFactors,
    time:number,
    metaTime:number,
    context:CanvasRenderingContext2D)
  => EffectHandlerResult|null;

export default EffectHandler;
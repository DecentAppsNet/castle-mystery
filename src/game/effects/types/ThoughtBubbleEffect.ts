import Character from "@/game/types/Character";
import ScalingFactors from "@/game/types/ScalingFactors";
import EffectBase from "./EffectBase";

type ThoughtBubbleEffect = EffectBase & {
  character:Character,
  scalingFactors:ScalingFactors,
  gameTime:number,
  thought:string
}

export default ThoughtBubbleEffect;

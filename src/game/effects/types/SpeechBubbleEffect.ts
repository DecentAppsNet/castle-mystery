import Character from "@/game/types/Character";
import ScalingFactors from "@/game/types/ScalingFactors";
import EffectBase from "./EffectBase";

type SpeechBubbleEffect = EffectBase & {
  character:Character,
  scalingFactors:ScalingFactors,
  gameTime:number,
  speech:string
}

export default SpeechBubbleEffect;
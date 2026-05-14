import Character from "../../types/Character";
import ScalingFactors from "../../types/ScalingFactors";
import EffectBase from "./EffectBase";

type SpeechBubbleEffect = EffectBase & {
  character:Character,
  scalingFactors:ScalingFactors,
  gameTime:number,
  speech:string
}

export default SpeechBubbleEffect;
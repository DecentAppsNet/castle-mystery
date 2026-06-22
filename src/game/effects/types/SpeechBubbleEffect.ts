import Character from "@/game/types/Character";
import Position from "@/game/types/Position";
import ScalingFactors from "@/game/types/ScalingFactors";
import EffectBase from "./EffectBase";

type SpeechBubbleEffect = EffectBase & {
  character:Character,
  displayPosition:Position,
  scalingFactors:ScalingFactors,
  gameTime:number,
  speech:string
}

export default SpeechBubbleEffect;
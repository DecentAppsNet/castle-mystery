import Character from "../../types/Character";
import ScalingFactors from "../../types/ScalingFactors";
import EffectBase from "./EffectBase";

type CharacterSelectEffect = EffectBase & {
  character:Character,
  scalingFactors:ScalingFactors,
  startRadiusPixels:number,
  endRadiusPixels:number,
  particleRadiusPixels:number,
  particleCount:number,
  centerYOffsetPixels:number
}

export default CharacterSelectEffect;
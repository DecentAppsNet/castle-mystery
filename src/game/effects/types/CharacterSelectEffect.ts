import Character from "@/game/types/Character";
import Position from "@/game/types/Position";
import ScalingFactors from "@/game/types/ScalingFactors";
import EffectBase from "./EffectBase";

type CharacterSelectEffect = EffectBase & {
  character:Character,
  displayPosition:Position,
  scalingFactors:ScalingFactors,
  startRadiusPixels:number,
  endRadiusPixels:number,
  particleRadiusPixels:number,
  particleCount:number,
  centerYOffsetPixels:number
}

export default CharacterSelectEffect;
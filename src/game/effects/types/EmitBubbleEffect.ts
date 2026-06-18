import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import ScalingFactors from "@/game/types/ScalingFactors";
import EffectBase from "./EffectBase";

type EmitBubbleEffect = EffectBase & {
  room:Room,
  item:Item|null,
  ownerCharacter:Character|null,
  scalingFactors:ScalingFactors,
  gameTime:number,
  emitText:string
}

export default EmitBubbleEffect;
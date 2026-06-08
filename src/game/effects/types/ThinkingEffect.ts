import Character from "@/game/types/Character";
import EffectBase from "./EffectBase";

type ThinkingEffect = EffectBase & {
  character:Character,
  thoughtStartTime:number,
  thoughtEndTime:number,
  gameTime:number
}

export default ThinkingEffect;
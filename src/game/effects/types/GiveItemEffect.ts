import Item from "@/game/types/Item";
import EffectBase from "./EffectBase";

type GiveItemEffect = EffectBase & {
  item:Item,
  startCanvasPosition:{ x:number, y:number },
  endCanvasPosition:{ x:number, y:number }
}

export default GiveItemEffect;
import Item from "@/game/types/Item";
import EffectBase from "./EffectBase";

type GiveItemEffect = EffectBase & {
  item:Item,
  startCanvasX:number,
  startCanvasY:number,
  endCanvasX:number,
  endCanvasY:number,
  glyphFontSize:number,
  labelFontSize:number,
  labelOffsetY:number
}

export default GiveItemEffect;
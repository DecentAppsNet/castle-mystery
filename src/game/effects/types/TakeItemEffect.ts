import Item from "@/game/types/Item";
import EffectBase from "./EffectBase";

type TakeItemEffect = EffectBase & {
  item:Item,
  startCanvasX:number,
  startCanvasY:number,
  glyphFontSize:number,
  labelFontSize:number,
  labelOffsetY:number,
  riseDistancePixels:number
}

export default TakeItemEffect;

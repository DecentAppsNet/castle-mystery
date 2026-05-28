import Item from "@/game/types/Item";
import EffectBase from "./EffectBase";

type GiveItemEffect = EffectBase & {
  item:Item,
  startCanvasX:number,
  startCanvasY:number,
  endCanvasX:number,
  endCanvasY:number,
  cuboidWidthPixels:number,
  cuboidHeightPixels:number,
  cuboidDepthXPixels:number,
  cuboidDepthYPixels:number,
  cuboidLineWidthPixels:number,
  labelFontSize:number,
  labelOffsetY:number
}

export default GiveItemEffect;
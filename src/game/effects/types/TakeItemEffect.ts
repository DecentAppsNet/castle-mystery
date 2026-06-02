import Item from "@/game/types/Item";
import EffectBase from "./EffectBase";

type TakeItemEffect = EffectBase & {
  item:Item,
  startCanvasX:number,
  startCanvasY:number,
  cuboidWidthPixels:number,
  cuboidHeightPixels:number,
  cuboidDepthXPixels:number,
  cuboidDepthYPixels:number,
  cuboidLineWidthPixels:number,
  riseDistancePixels:number
}

export default TakeItemEffect;

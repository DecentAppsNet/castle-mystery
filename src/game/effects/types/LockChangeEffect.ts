import EffectBase from "./EffectBase";

type LockChangeEffect = EffectBase & {
  image:ImageBitmap|null,
  startCanvasX:number,
  startCanvasY:number,
  drawWidthPixels:number,
  drawHeightPixels:number,
  offsetXPixels:number,
  travelYPixels:number
}

export default LockChangeEffect;
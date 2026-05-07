import EffectBase from "./EffectBase";

type ItemDiscoveryEffect = EffectBase & {
  centerCanvasX:number,
  centerCanvasY:number,
  baseRadiusPixels:number,
  maxRadiusPixels:number,
  lineWidth:number,
  ringCount:number
}

export default ItemDiscoveryEffect;
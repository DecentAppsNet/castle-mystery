import EffectBase from "./EffectBase";

type LockChangeEffect = EffectBase & {
  image:ImageBitmap|null,
  exitX:number,
  exitY:number,
  travelDirection:number
}

export default LockChangeEffect;
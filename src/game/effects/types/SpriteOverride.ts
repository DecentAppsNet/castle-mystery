import PartKind from '@/game/characterBody/types/PartKind';

type BodyPartTarget<Kind extends PartKind> = { spriteKind:Kind };

/** Body-part transforms are deltas from the current resolved pose; zero leaves it unchanged. */
type SpriteOverride = BodyPartTarget<'head'> & {
  transformType:'rotate',
  /** Relative angular adjustment in radians. */
  rotateRadians:number
}|BodyPartTarget<'nearArm'|'farArm'> & {
  transformType:'rotate',
  rotateRadians:number
}|BodyPartTarget<'leftLeg'|'rightLeg'> & {
  transformType:'translatePartHeight',
  /** Canvas-Y displacement in units of this part's logical height, projected once; negative is upward. */
  translateHeightRatio:number
}|{
  spriteKind:'leftHandItem'|'rightHandItem',
  transformType:'translateCanvas',
  translateCanvasX:number,
  translateCanvasY:number
};

export default SpriteOverride;
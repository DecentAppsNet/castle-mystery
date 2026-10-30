import PartKind from '@/game/characterBody/types/PartKind';
import ViewerArmKind from '@/game/characterBody/types/ViewerArmKind';

type BodyPartTarget<Kind extends PartKind|ViewerArmKind> = { spriteKind:Kind };

/** Current body transforms are relative deltas; zero preserves the resolved pose.
 * Future absolute variants must include `absolute` in their name.
 * Viewer arm targets select visual depth roles; PartKind targets select exact parts. */
type SpriteOverride = BodyPartTarget<'head'> & {
  transformType:'rotate',
  /** Relative angular adjustment in radians. */
  rotateRadians:number
}|BodyPartTarget<'nearArm'|'farArm'|ViewerArmKind> & {
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
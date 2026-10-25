import Point from '@/game/types/Point';
import RasterPartGeometry from './RasterPartGeometry';

/** Complete, validated right-facing anatomy in source pixels; URLs are already resolved. */
type RasterBodyDefinition = {
  readonly parts:{
    readonly torso:RasterPartGeometry,
    readonly head:RasterPartGeometry,
    readonly leftArm:RasterPartGeometry,
    readonly rightArm:RasterPartGeometry,
    readonly leftLeg:RasterPartGeometry,
    readonly rightLeg:RasterPartGeometry
  },
  readonly connections:{
    readonly head:Point,
    readonly leftArm:Point,
    readonly rightArm:Point,
    readonly leftLeg:Point,
    readonly rightLeg:Point
  }
};

export default RasterBodyDefinition;
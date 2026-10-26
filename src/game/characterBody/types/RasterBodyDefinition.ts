import Point from '@/game/types/Point';
import RasterPartGeometry from './RasterPartGeometry';

/** Complete, validated right-facing anatomy in source pixels; URLs are already resolved. */
type RasterBodyDefinition = {
  readonly parts:{
    readonly torso:RasterPartGeometry,
    readonly head:RasterPartGeometry,
    readonly farArm:RasterPartGeometry,
    readonly nearArm:RasterPartGeometry,
    readonly leftLeg:RasterPartGeometry,
    readonly rightLeg:RasterPartGeometry
  },
  readonly connections:{
    readonly head:Point,
    readonly farArm:Point,
    readonly nearArm:Point,
    readonly leftLeg:Point,
    readonly rightLeg:Point
  }
};

export default RasterBodyDefinition;
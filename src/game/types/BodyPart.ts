import ConnectedBodyPart from './ConnectedBodyPart';
import PartKind from './PartKind';
import Point from './Point';

type BodyPart = {
  readonly kind:PartKind,
  readonly width:number, // Local drawing width in game units, not canvas pixels.
  readonly height:number, // Local drawing height in game units, not canvas pixels.
  readonly pivotPoint:Point,
  readonly connectedParts:readonly ConnectedBodyPart[],
  readonly handPoint:Point|null // Null means the part has no hand attachment point.
};

export default BodyPart;
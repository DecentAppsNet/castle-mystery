import ConnectedBodyPart from './ConnectedBodyPart';
import PartKind from './PartKind';
import Point from '@/game/types/Point';

type BodyPart = {
  readonly kind:PartKind,
  readonly width:number, // Local drawing width in game units, not canvas pixels.
  readonly height:number, // Local drawing height in game units, not canvas pixels.
  readonly pivotPoint:Point, // Game units from this part's local origin.
  readonly connectedParts:readonly ConnectedBodyPart[],
  readonly handPoint:Point|null // Game units from this part's local origin. Null means no hand attachment point.
};

export default BodyPart;
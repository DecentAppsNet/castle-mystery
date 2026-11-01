import ConnectedBodyPart from './ConnectedBodyPart';
import PartKind from './PartKind';
import Point from '@/game/types/Point';

/** Readonly local geometry and attachments shared across poses; contains no resolved placement. */
type BodyPart = {
  readonly pivotPoint:Point, // Game units from this part's local origin.
  readonly connectedParts:readonly ConnectedBodyPart[]
} & ({
  readonly kind:Exclude<PartKind, 'nearHand'|'farHand'>,
  readonly imageUrl:string|null,
  readonly width:number, // Local drawing width in game units, not canvas pixels.
  readonly height:number // Local drawing height in game units, not canvas pixels.
}|{
  readonly kind:'nearHand'|'farHand',
  readonly imageUrl:null,
  readonly width:0,
  readonly height:0
});

export default BodyPart;
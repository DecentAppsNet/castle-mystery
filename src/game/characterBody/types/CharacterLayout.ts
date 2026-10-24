import Point from '@/game/types/Point';
import Rect from '@/game/types/Rect';
import ResolvedBodyPart from './ResolvedBodyPart';

/** Ephemeral projected body geometry; every coordinate and dimension is in canvas pixels. */
type CharacterLayout = {
  readonly parts:readonly ResolvedBodyPart[],
  readonly bounds:Rect,
  readonly characterCenterCanvasPoint:Point,
  readonly head:{ readonly centerX:number, readonly centerY:number, readonly radius:number },
  readonly leftHand:{ readonly x:number, readonly y:number },
  readonly rightHand:{ readonly x:number, readonly y:number },
  readonly anchorX:number,
  readonly anchorTopY:number
};

export default CharacterLayout;
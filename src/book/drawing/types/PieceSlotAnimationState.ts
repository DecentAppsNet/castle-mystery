export default interface PieceSlotAnimationState {
  readonly offsetX:number;
  readonly scale:number;
  /** Radians counterclockwise from right; null disables the glint. */
  readonly glintAngle:number|null;
}
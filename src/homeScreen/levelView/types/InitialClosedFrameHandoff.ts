/** One-time closed-frame notification advanced only by Canvas animation-frame observations. */
type InitialClosedFrameHandoff = {
  /** Null until a closed curtain has been drawn in an animation frame. Synchronous draws do not set this. */
  drawnAt:number|null,
  hasAnnounced:boolean
};

export default InitialClosedFrameHandoff;
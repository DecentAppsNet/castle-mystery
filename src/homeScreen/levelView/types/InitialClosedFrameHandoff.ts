/** One-time startup paint notification and its cancellable animation-frame request. */
type InitialClosedFrameHandoff = {
  /** Null when no handoff animation frame is outstanding: before scheduling, after cancellation, or after notification. */
  pendingFrame:number|null,
  hasAnnounced:boolean
};

export default InitialClosedFrameHandoff;
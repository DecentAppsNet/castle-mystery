import type CurtainPresentation from './CurtainPresentation';

/** Curtain presentation with transition and closed-hold deadlines and completion status. */
type CurtainFrame = CurtainPresentation & Readonly<{
  isTransitionComplete:boolean,
  transitionEndsAt:number|null,
  closedHoldEndsAt:number|null,
  isClosedHoldComplete:boolean
}>;

export default CurtainFrame;
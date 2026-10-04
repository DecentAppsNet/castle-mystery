import type CurtainPresentation from './CurtainPresentation';

/** Curtain presentation with transition and closed-hold deadlines and completion status. */
type CurtainFrame = CurtainPresentation & Readonly<{
  isTransitionComplete:boolean,
  /** Null in the stationary open and closed phases, which have no animation completion deadline. */
  transitionEndsAt:number|null,
  /** Null in the opening and open phases, where no closed hold applies. */
  closedHoldEndsAt:number|null,
  isClosedHoldComplete:boolean
}>;

export default CurtainFrame;
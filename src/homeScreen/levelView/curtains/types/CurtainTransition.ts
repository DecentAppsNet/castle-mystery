/** Presentation phase and its start timestamp in milliseconds; closed starts when the fully closed view is established. */
type CurtainTransition = Readonly<{
  phase:'open'|'closing'|'closed'|'opening',
  startedAt:number
}>;

export default CurtainTransition;
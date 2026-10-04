/** Values needed to paint the curtain overlay, independent of transition bookkeeping. */
type CurtainPresentation = Readonly<{
  curtainAmount:number,
  valanceAmount:number,
  settlingDisplacement:number,
  canRenderScene:boolean
}>;

export default CurtainPresentation;
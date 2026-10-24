/** Affine mapping with coefficients in Canvas (a, b, c, d, e, f) order, without a Canvas dependency. */
type BodyPartTransform = {
  readonly horizontalX:number, // Output X units per input X unit (Canvas coefficient a).
  readonly horizontalY:number, // Output Y units per input X unit (Canvas coefficient b).
  readonly verticalX:number, // Output X units per input Y unit (Canvas coefficient c).
  readonly verticalY:number, // Output Y units per input Y unit (Canvas coefficient d).
  readonly translateX:number, // Output-space X units: game units before projection, canvas pixels afterward.
  readonly translateY:number // Output-space Y units: game units before projection, canvas pixels afterward.
};

export default BodyPartTransform;
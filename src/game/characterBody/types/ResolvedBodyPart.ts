import BodyPart from './BodyPart';
import BodyPartTransform from './BodyPartTransform';

/** Hierarchical placement is resolved; the shared definition's local coordinates remain unchanged. */
type ResolvedBodyPart = {
  readonly part:BodyPart, // Original shared definition, unchanged; dimensions and points remain in local game units.
  readonly transform:BodyPartTransform // Includes ancestors; maps local game units to layout game units or projected canvas pixels.
};

export default ResolvedBodyPart;
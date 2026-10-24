import BodyPart from './BodyPart';
import BodyPartTransform from './BodyPartTransform';

type ResolvedBodyPart = {
  readonly part:BodyPart,
  readonly transform:BodyPartTransform // Maps local game units to layout game units, or canvas pixels after projection.
};

export default ResolvedBodyPart;
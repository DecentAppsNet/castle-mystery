import BodyPart from './BodyPart';
import Point from '@/game/types/Point';

/** Attaches a child pivot to a point in its parent's local coordinate space. */
type ConnectedBodyPart = {
  readonly part:BodyPart,
  readonly connectionPoint:Point // Game units from the parent part's local origin.
};

export default ConnectedBodyPart;
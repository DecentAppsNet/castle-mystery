import BodyPart from './BodyPart';
import Point from '@/game/types/Point';

type ConnectedBodyPart = {
  readonly part:BodyPart,
  readonly connectionPoint:Point // Game units from the parent part's local origin.
};

export default ConnectedBodyPart;
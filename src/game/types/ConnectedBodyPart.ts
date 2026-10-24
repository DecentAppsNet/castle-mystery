import BodyPart from './BodyPart';
import Point from './Point';

type ConnectedBodyPart = {
  readonly part:BodyPart,
  readonly connectionPoint:Point
};

export default ConnectedBodyPart;
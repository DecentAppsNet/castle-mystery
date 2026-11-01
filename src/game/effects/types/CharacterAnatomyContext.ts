import { BodyOrientation } from '@/game/types/Character';

type CharacterAnatomyContext = {
  readonly bodyOrientation:BodyOrientation,
  readonly isNearArmHoldingItem:boolean,
  readonly isFarArmHoldingItem:boolean
};

export default CharacterAnatomyContext;
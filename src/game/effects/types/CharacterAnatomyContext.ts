import { BodyOrientation } from '@/game/types/Character';
import ScalingFactors from '@/game/types/ScalingFactors';
import Item from '@/game/types/Item';
import Position from '@/game/types/Position';
import Point from '@/game/types/Point';

type RoomItemDisplayQuery = {
  readonly findProspectiveItemDisplayPosition:(item:Item, destinationFloorPosition:Position,
    insertionRoomItemI?:number) => Position
};

type CharacterAnatomyContext = {
  readonly bodyOrientation:BodyOrientation,
  readonly isNearArmHoldingItem:boolean,
  readonly isFarArmHoldingItem:boolean,
  readonly leftHandPartKind:'nearHand'|'farHand',
  readonly scalingFactors:Readonly<ScalingFactors>,
  readonly baseCharacterCenterById:ReadonlyMap<string, Point>,
  readonly roomItemCenterOffsetById:ReadonlyMap<string, Point>,
  readonly roomContentDisplayLayout:RoomItemDisplayQuery
};

export default CharacterAnatomyContext;
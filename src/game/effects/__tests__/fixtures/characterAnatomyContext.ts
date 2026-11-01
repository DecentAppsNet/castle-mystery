import { createRoomContentDisplayLayout } from '@/game/roomContentDisplayPositionUtil';
import { createDefaultRoom } from '@/game/types/Room';
import CharacterAnatomyContext from '@/game/effects/types/CharacterAnatomyContext';
import { createDefaultItem } from '@/game/types/Item';

const characterAnatomyContext:CharacterAnatomyContext = {
  bodyOrientation:'standing', isNearArmHoldingItem:false, isFarArmHoldingItem:false,
  leftHandPartKind:'farHand',
  roomItemCenterOffsetById:new Map([[createDefaultItem().id, [-3, -40]]]),
  scalingFactors:{ sourceX:0, sourceY:0, sourceWidth:1000, sourceHeight:1000,
    scaleX:2, scaleY:3, translateX:100, translateY:200, roomFontHeight:16,
    roomLineWidth:1, destWidth:2000, destHeight:3000 },
  roomContentDisplayLayout:createRoomContentDisplayLayout(createDefaultRoom(), [])
};

export default characterAnatomyContext;
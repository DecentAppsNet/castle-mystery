import { RoomContentDisplayLayout } from "@/game/roomContentDisplayPositionUtil";
import ImageSet from "@/game/types/ImageSet";

type CharacterItemTransferDrawContext = {
  characterCenterCanvasPoint:[number, number],
  leftHandItemCanvasPoint:[number, number],
  rightHandItemCanvasPoint:[number, number],
  roomContentDisplayLayout:RoomContentDisplayLayout,
  imageSet:ImageSet
};

export default CharacterItemTransferDrawContext;
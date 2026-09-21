import { RoomContentDisplayLayout } from "@/game/roomContentDisplayPositionUtil";
import ImageSet from "@/game/types/ImageSet";
import CharacterCanvasAnatomy from "./CharacterCanvasAnatomy";

type CharacterEffectDrawContext = {
  characterAnatomy:CharacterCanvasAnatomy,
  characterAnatomyById:ReadonlyMap<string, CharacterCanvasAnatomy>,
  imageSet:ImageSet,
  isCharacterInActiveRoom:boolean,
  isLevelComplete:boolean,
  roomContentDisplayLayout:RoomContentDisplayLayout
}

export default CharacterEffectDrawContext;
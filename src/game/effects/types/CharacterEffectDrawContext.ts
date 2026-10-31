import { RoomContentDisplayLayout } from "@/game/roomContentDisplayPositionUtil";
import ImageSet from "@/game/types/ImageSet";
import { BodyOrientation } from "@/game/types/Character";
import CharacterCanvasAnatomy from "./CharacterCanvasAnatomy";

type CharacterEffectDrawContext = {
  bodyOrientation:BodyOrientation,
  characterAnatomy:CharacterCanvasAnatomy,
  characterAnatomyById:ReadonlyMap<string, CharacterCanvasAnatomy>,
  imageSet:ImageSet,
  isActiveCharacter:boolean,
  isCharacterInActiveRoom:boolean,
  isLevelComplete:boolean,
  roomContentDisplayLayout:RoomContentDisplayLayout
}

export default CharacterEffectDrawContext;
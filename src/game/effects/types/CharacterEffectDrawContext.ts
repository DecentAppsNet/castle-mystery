import CharacterCanvasAnatomy from "./CharacterCanvasAnatomy";
import CharacterItemTransferDrawContext from "./CharacterItemTransferDrawContext";

type CharacterEffectDrawContext = {
  characterAnatomy:CharacterCanvasAnatomy,
  characterAnatomyById:ReadonlyMap<string, CharacterCanvasAnatomy>,
  isCharacterInActiveRoom:boolean,
  isLevelComplete:boolean,
  itemTransfer:CharacterItemTransferDrawContext
}

export default CharacterEffectDrawContext;
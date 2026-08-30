import CharacterItemTransferDrawContext from "./CharacterItemTransferDrawContext";

type CharacterEffectDrawContext = {
  anchorX:number,
  anchorTopY:number,
  isCharacterInActiveRoom:boolean,
  isLevelComplete:boolean,
  itemTransfer:CharacterItemTransferDrawContext
}

export default CharacterEffectDrawContext;
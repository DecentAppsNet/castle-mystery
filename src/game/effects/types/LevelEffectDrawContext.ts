import LevelEffectCharacterLocation from "./LevelEffectCharacterLocation"

type LevelEffectDrawContext = {
  characterLocationById:ReadonlyMap<string, LevelEffectCharacterLocation>,
  isLevelComplete:boolean,
  activeRoomTopCenterCanvasPoint:[number, number]
}

export default LevelEffectDrawContext;

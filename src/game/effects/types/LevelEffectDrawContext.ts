import LevelEffectCharacterLocation from "./LevelEffectCharacterLocation"
import FramePresentationIndex from "./FramePresentationIndex"

type LevelEffectDrawContext = {
  characterLocationById:ReadonlyMap<string, LevelEffectCharacterLocation>,
  framePresentationIndex:FramePresentationIndex,
  isLevelComplete:boolean,
  activeRoomTopCenterCanvasPoint:[number, number]
}

export default LevelEffectDrawContext;

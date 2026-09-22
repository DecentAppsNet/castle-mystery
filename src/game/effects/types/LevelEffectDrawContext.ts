import LevelEffectCharacterLocation from "./LevelEffectCharacterLocation"
import FramePresentationIndex from "./FramePresentationIndex"
import Rect from "@/game/types/Rect"

type LevelEffectDrawContext = {
  characterLocationById:ReadonlyMap<string, LevelEffectCharacterLocation>,
  framePresentationIndex:FramePresentationIndex,
  roomRectById:ReadonlyMap<string, Rect>,
  activeRoomId:string,
  activeRoomRect:Rect,
  isLevelComplete:boolean,
  activeRoomTopCenterCanvasPoint:[number, number]
}

export default LevelEffectDrawContext;

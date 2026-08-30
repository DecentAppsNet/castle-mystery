type LevelEffectDrawContext = {
  characterIdsInActiveRoom:ReadonlySet<string>,
  isLevelComplete:boolean,
  activeRoomTopCenterCanvasPoint:[number, number]
}

export default LevelEffectDrawContext;

type LevelEffectCharacterLocation = {
  kind:'activeRoom'
} | {
  kind:'adjacentOpenExit',
  exitTargetCanvasPoint:[number, number],
  activeRoomInteriorCanvasPoint:[number, number]
} | {
  kind:'outsideLocalAudibleRange'
}

export default LevelEffectCharacterLocation;

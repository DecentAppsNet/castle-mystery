import Rect from "@/game/types/Rect";

type CharacterRoomGeometry = {
  roomId:string|null,
  roomRect:Rect|null
};

type LevelEffectCharacterLocation = CharacterRoomGeometry & ({
  kind:'activeRoom'
} | {
  kind:'adjacentOpenExit',
  exitTargetCanvasPoint:[number, number],
  activeRoomInteriorCanvasPoint:[number, number]
} | {
  kind:'outsideLocalAudibleRange'
});

export default LevelEffectCharacterLocation;

import Position from "@/game/types/Position";

type EmitSource = Readonly<{
  kind:'character',
  characterId:string
} | {
  kind:'floorItem',
  itemId:string,
  roomId:string,
  roomI:number,
  position:Readonly<Position>
} | {
  kind:'heldItem',
  itemId:string,
  ownerCharacterId:string,
  ownerCharacterI:number,
  hand:'left'|'right'
}>;

export default EmitSource;
import Item from "@/game/types/Item";

type ItemKeyframeLocation = {
  kind:'inventory'|'leftHand'|'rightHand',
  item:Item,
  characterI:number
} | {
  kind:'room',
  item:Item,
  roomI:number
}

export default ItemKeyframeLocation;
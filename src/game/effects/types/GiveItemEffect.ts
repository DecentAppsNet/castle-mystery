import Item from "@/game/types/Item";
import Position from "@/game/types/Position";
import EffectBase from "./EffectBase";

type GiveItemEffect = EffectBase & {
  item:Item,
  startPosition:Position,
  endPosition:Position
}

export default GiveItemEffect;
import Item from "@/game/types/Item";
import EffectBase from "./EffectBase";

type DropItemEffect = EffectBase & {
  item:Item
}

export default DropItemEffect;
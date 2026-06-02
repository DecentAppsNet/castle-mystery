import Item from "@/game/types/Item";
import EffectBase from "./EffectBase";

type TakeItemEffect = EffectBase & {
  item:Item
}

export default TakeItemEffect;

import CanvasBubbleAnchor from "@/game/effects/types/CanvasBubbleAnchor";
import CharacterEffectDrawEntry from "../characters/types/CharacterEffectDrawEntry";

type RoomDrawResult = {
  characterEffectDrawEntries:CharacterEffectDrawEntry[],
  characterBubbleAnchorById:Map<string, CanvasBubbleAnchor>,
  itemBubbleAnchorById:Map<string, CanvasBubbleAnchor>
};

export default RoomDrawResult;
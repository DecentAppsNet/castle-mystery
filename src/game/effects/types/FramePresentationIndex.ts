import CanvasBubbleAnchor from "./CanvasBubbleAnchor";

type FramePresentationIndex = Readonly<{
  characterBubbleAnchorById:ReadonlyMap<string, CanvasBubbleAnchor>,
  itemBubbleAnchorById:ReadonlyMap<string, CanvasBubbleAnchor>
}>;

export default FramePresentationIndex;
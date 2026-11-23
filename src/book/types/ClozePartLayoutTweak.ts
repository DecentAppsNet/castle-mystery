import Point from "@/game/types/Point";

type ClozePartLayoutTweak = {
  // If set to true, the cloze part won't be drawn to page.
  isHidden:boolean,

  // If specified and cloze part kind supports, overrides the positioning and dimensions of the cloze part.
  // Units are percent of the page rect.
  cursorPoint:Point|null
}

export default ClozePartLayoutTweak;
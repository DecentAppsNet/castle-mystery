import TimeLabel from "@/game/types/TimeLabel";

type TimeLabelPositions = {
  containerWidth:number, // The container width that was used for calculating positions.
  labels:TimeLabel[],
  positions:number[] // X position inside container.
}

export default TimeLabelPositions;
import ClozePart from './ClozePart';

type Conclusion = {
  readonly id: string;
  readonly title: string;
  parts: ClozePart[];
  isComplete:boolean;
  isLocked:boolean;
  isOptional:boolean;
  incorrectGuessCount:number;
  readonly unlockConclusionIds:readonly string[];
  readonly revealRoomIds:readonly string[];
};

export default Conclusion;
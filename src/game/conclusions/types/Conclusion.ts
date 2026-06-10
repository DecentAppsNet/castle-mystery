import ClozePart, { duplicateClozePart } from './ClozePart';

type Conclusion = {
  readonly id: string;
  readonly title: string;
  parts: ClozePart[];
  isComplete:boolean;
  isLocked:boolean;
  readonly unlockConclusionIds:readonly string[];
  readonly revealRoomIds:readonly string[];
};

export function createDefaultConclusion():Conclusion {
  return {
    id:'conclusion',
    title:'Conclusion',
    parts:[],
    isComplete:false,
    isLocked:false,
    unlockConclusionIds:[],
    revealRoomIds:[]
  };
}

export function duplicateConclusion(from:Conclusion):Conclusion {
  return {
    id:from.id,
    title:from.title,
    parts:from.parts.map(duplicateClozePart),
    isComplete:from.isComplete,
    isLocked:from.isLocked,
    unlockConclusionIds:[...from.unlockConclusionIds],
    revealRoomIds:[...from.revealRoomIds]
  };
}

export default Conclusion;

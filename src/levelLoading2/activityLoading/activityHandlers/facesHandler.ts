import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createFacesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const faces = makeVerb('faces');
  const direction = makeOptions([
    makeLiteral('left'),
    makeLiteral('right'),
    makeIdentifier('toCharacterId', 'CharacterId'),
    makeIdentifier('toItemId', 'ItemId')
  ]);
  const rootParseStep = makeSequence([characterId, faces, direction]);
  return createParseFormat(rootParseStep);
}

export function scheduleFacesActivity(_level:Level,
    _activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createGivesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const gives = makeVerb('gives');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const to = makeLiteral('to');
  const toCharacterId = makeIdentifier('toCharacterId', 'CharacterId');
  const rootParseStep = makeSequence([characterId, gives, itemId, to, toCharacterId]);
  return createParseFormat(rootParseStep);
}

export function scheduleGivesActivity(_level:Level,
    _activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createShowParseFormat():ParseFormat {
  const show = makeVerb('show');
  const target = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ]);
  const rootParseStep = makeSequence([show, target]);
  return createParseFormat(rootParseStep);
}

export function scheduleShowActivity(_level:Level,
    _activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
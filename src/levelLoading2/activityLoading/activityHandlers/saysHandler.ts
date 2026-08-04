import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeText, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createSaysParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const says = makeVerb('says');
  const text = makeText();
  const toSequence = makeSequence([
    makeLiteral('to'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ], true);
  const rootParseStep = makeSequence([characterId, says, text, toSequence]);
  return createParseFormat(rootParseStep);
}

export function scheduleSaysActivity(_level:Level,
    _activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
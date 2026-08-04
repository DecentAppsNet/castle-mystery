import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeText, makeVariableLiteral, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createEmitsParseFormat():ParseFormat {
  const subject = makeOptions([
    makeIdentifier('characterId', 'CharacterId', true),
    makeIdentifier('itemId', 'ItemId'),
  ], true);
  const emits = makeVerb('emits');
  const text = makeText();
  const loudly = makeVariableLiteral('isLoud', 'loudly', true);
  const rootParseStep = makeSequence([subject, emits, text, loudly]);
  return createParseFormat(rootParseStep);
}

export function scheduleEmitsActivity(_level:Level,
    _activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
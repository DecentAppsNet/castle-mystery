import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createLaysParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('lays'),
  ]);
  return createParseFormat(rootParseStep);
}

export function scheduleLaysActivity(_level:Level,
    _activity:Activity, _editableItinerary:EditableItinerary, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
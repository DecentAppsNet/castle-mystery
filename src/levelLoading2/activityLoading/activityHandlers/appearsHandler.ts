import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createAppearsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const appears = makeVerb('appears');
  const as = makeLiteral('as', true);
  const appearanceId = makeIdentifier('appearanceId', 'AppearanceId');
  const rootParseStep = makeSequence([characterId, appears, as, appearanceId]);
  return createParseFormat(rootParseStep);
}

export function scheduleAppearsActivity(_level:Level,
    _activity:Activity, _editableItinerary:EditableItinerary, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
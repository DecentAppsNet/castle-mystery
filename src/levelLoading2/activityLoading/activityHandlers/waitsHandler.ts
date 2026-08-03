import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeNumber, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createWaitsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const waits = makeVerb('waits');
  const seconds = makeNumber('seconds', true);
  const rootParseStep = makeSequence([characterId, waits, seconds]);
  return createParseFormat(rootParseStep);
}

export function scheduleWaitsActivity(_level:Level,
    _activity:Activity, _editableItinerary:EditableItinerary, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
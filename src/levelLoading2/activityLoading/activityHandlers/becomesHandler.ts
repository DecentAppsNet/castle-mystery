import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createBecomesParseFormat():ParseFormat {
  const itemId = makeIdentifier('itemId', 'ItemId');
  const becomes = makeVerb('becomes');
  const toItemId = makeIdentifier('toItemId', 'ItemId');
  const rootParseStep = makeSequence([itemId, becomes, toItemId]);
  return createParseFormat(rootParseStep);
}

export function scheduleBecomesActivity(_level:Level,
    _activity:Activity, _editableItinerary:EditableItinerary, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createHideParseFormat():ParseFormat {
  const hide = makeVerb('hide');
  const target = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ]);
  const rootParseStep = makeSequence([hide, target]);
  return createParseFormat(rootParseStep);
}

export function scheduleHideActivity(_level:Level,
    _activity:Activity, _editableItinerary:EditableItinerary, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}
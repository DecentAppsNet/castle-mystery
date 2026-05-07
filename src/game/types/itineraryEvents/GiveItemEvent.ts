import ItineraryEventBase from "./ItineraryEventBase";

type GiveItemEvent = ItineraryEventBase & {
  itemId:string,
  recipientCharacterId:string
}

export function duplicateGiveItemEvent(from:GiveItemEvent):GiveItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    itemId:from.itemId,
    recipientCharacterId:from.recipientCharacterId
  };
}

export default GiveItemEvent;

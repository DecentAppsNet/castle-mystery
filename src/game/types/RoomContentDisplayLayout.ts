import Item from './Item';
import Position from './Position';
import RoomContentDisplayLayoutEntry from './RoomContentDisplayLayoutEntry';

/** Ephemeral room presentation data with a bound query for prospective transfer positions.
 * The query captures calculated stack support and the source room, not a detached snapshot.
 * Consume it within the same presentation frame, without changing the room's items. */
type RoomContentDisplayLayout = {
  itemLayoutById:ReadonlyMap<string, RoomContentDisplayLayoutEntry>,
  characterLayoutById:ReadonlyMap<string, RoomContentDisplayLayoutEntry>,
  findProspectiveItemDisplayPosition:(item:Item, destinationFloorPosition:Position,
    insertionRoomItemI?:number) => Position
}

export default RoomContentDisplayLayout;
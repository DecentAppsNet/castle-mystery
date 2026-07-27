import Item, { duplicateItem } from "@/game/types/Item";
import Room, { createDefaultRoom } from "@/game/types/Room";

type RoomKeyframe = {
  items: Item[];
};

const DEFAULT_ROOM:Readonly<Room> = createDefaultRoom();

export function createDefaultRoomKeyframe():RoomKeyframe {
  return { items:DEFAULT_ROOM.items };
}

export function duplicateRoomKeyframe(from:RoomKeyframe) {
  return { items:from.items.map(duplicateItem) };
}

export const ROOM_KEYFRAME_KEYS = Object.keys(createDefaultRoomKeyframe());

export default RoomKeyframe;
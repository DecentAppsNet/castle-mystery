type RoomShellVariant = 'active'|'inactive';

type RoomShellVariantImages = Readonly<{
  active:CanvasImageSource|null,
  inactive:CanvasImageSource|null
}>;

type RoomShellCache = Map<string, RoomShellVariantImages>;

export function createEmptyRoomShellCache():RoomShellCache {
  return new Map<string, RoomShellVariantImages>();
}

export function createEmptyRoomShellVariantImages():RoomShellVariantImages {
  return {
    active:null,
    inactive:null
  };
}

export default RoomShellCache;
export type { RoomShellVariant, RoomShellVariantImages };
type RoomShellVariant = 'active'|'inactive';

type RoomShellVariantImage = Readonly<{
  image:CanvasImageSource|null,
  width:number,
  height:number,
  padding:number
}>;

type RoomShellVariantImages = Readonly<{
  active:RoomShellVariantImage,
  inactive:RoomShellVariantImage,
  roof:RoomShellVariantImage
}>;

type RoomShellCache = Map<string, RoomShellVariantImages>;

export function createEmptyRoomShellCache():RoomShellCache {
  return new Map<string, RoomShellVariantImages>();
}

export function createEmptyRoomShellVariantImages():RoomShellVariantImages {
  return {
    active:{ image:null, width:0, height:0, padding:0 },
    inactive:{ image:null, width:0, height:0, padding:0 },
    roof:{ image:null, width:0, height:0, padding:0 }
  };
}

export default RoomShellCache;
export type { RoomShellVariant, RoomShellVariantImage, RoomShellVariantImages };
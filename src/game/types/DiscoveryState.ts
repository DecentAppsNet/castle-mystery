export type SkinLinkages = {[skinId:string]:Set<string>};

type DiscoveryState = {
  readonly discoverableCharacterCount:number,
  readonly discoverableItemCount:number,
  readonly discoverableRoomCount:number,
  readonly discoveredItemIds:Set<string>,
  readonly discoveredRoomIds:Set<string>,
  readonly discoveredSkinIds:Set<string>,
  readonly obscuredRoomIds:Set<string>,
  readonly revealedSkinLinkages:SkinLinkages,
  readonly titleKnownCharacterIds:Set<string>,
}

export default DiscoveryState;

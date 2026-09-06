type DiscoveryState = {
  readonly discoveredItemIds:Set<string>,
  readonly discoveredRoomIds:Set<string>,
  readonly discoveredCharacterIds:Set<string>,
  readonly discoveredSkinIds:Set<string>,
  readonly titleKnownCharacterIds:Set<string>,
  readonly obscuredRoomIds:Set<string>,
  readonly discoverableCharacterCount:number,
  readonly discoverableItemCount:number,
  readonly discoverableRoomCount:number,
}

export default DiscoveryState;

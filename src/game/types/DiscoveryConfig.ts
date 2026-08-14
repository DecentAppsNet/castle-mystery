type DiscoveryConfig = {
  readonly initiallyKnownTitleCharacterIds:ReadonlySet<string>,
  readonly initiallyObscuredRoomIds:ReadonlySet<string>,
  readonly discoverableCharacterCount:number,
  readonly discoverableItemCount:number,
  readonly discoverableRoomCount:number,
}

export default DiscoveryConfig;

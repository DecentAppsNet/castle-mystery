type Discoveries = {
  discoveredCharacterIconUrls:string[],
  characterCount:number,
  discoveredItemIconUrls:string[],
  itemCount:number,
  discoveredRoomCount:number,
  roomCount:number
};

export function createEmptyDiscoveries():Discoveries {
  return {
    discoveredCharacterIconUrls:[],
    characterCount:0,
    discoveredItemIconUrls:[],
    itemCount:0,
    discoveredRoomCount:0,
    roomCount:0
  };
}

export default Discoveries;
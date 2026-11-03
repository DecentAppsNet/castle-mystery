type ItemPlacementById = {
  [itemId:string]:Readonly<{ roomName:string, col:number, row:number }>|undefined
};

export default ItemPlacementById;
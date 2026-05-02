type Coord = {
  x: number,
  y: number
}

export function duplicateCoord(from:Coord):Coord {
  return {...from};
}

export default Coord;

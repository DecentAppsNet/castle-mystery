type Position = {
  x: number,
  y: number,
  z: number
}

export function duplicatePosition(from:Position):Position {
  return {...from};
}

export default Position;

type Position = {
  x: number,
  y: number,
  z: number
}

export function createDefaultPosition():Position {
  return {x:-1, y:-1, z:-1};
}

export function duplicatePosition(from:Position):Position {
  return {...from};
}

export function arePositionsEqual(a:Position, b:Position):boolean {
  return a.x == b.x && a.y === b.y && a.z === b.z;
}

export default Position;

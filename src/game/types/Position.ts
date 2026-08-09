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

export function arePositionsOrthogonal(a:Position, b:Position):boolean {
  let sameCount = 0;
  if (a.x === b.x) ++sameCount;
  if (a.y === b.y) ++sameCount;
  if (a.z === b.z) ++sameCount;
  return sameCount === 2;
}

export default Position;

let theSeed:boolean = false;
let theSequenceState:number = 0;

function _calcNextRand():number {
  theSequenceState = (theSequenceState + 0x6D2B79F5) | 0;
  let t = Math.imul(theSequenceState ^ (theSequenceState >>> 15), 1 | theSequenceState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t >>> 0) / 4294967296);
}

export function setSeed(seed: number): void {
  theSeed = true;
  // normalize to 32-bit unsigned integer
  theSequenceState = seed >>> 0;
  if (theSequenceState === 0) theSequenceState = 1;
}

export function clearSeed(): void {
  theSeed = false;
  theSequenceState = 0;
}

/* If no seed has been set, returns Math.random(). Otherwise returns a number between 0 (inclusive) and 1 (exclusive) 
   from a repeatable psuedo-random sequence generated from the seed. */
export function rand(): number {
  return theSeed ? _calcNextRand() : Math.random();
}

export function randInRange(minInclusive:number, maxExclusive:number):number {
  const min = Number(minInclusive);
  const max = Number(maxExclusive);
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new TypeError('min and max must be finite numbers');
  if (max <= min) throw new RangeError('maxExclusive must be greater than minInclusive');
  return min + rand() * (max - min);
}

export function randIntInRange(minInclusive:number, maxExclusive:number):number {
  const min = Math.ceil(Number(minInclusive));
  const max = Math.floor(Number(maxExclusive));
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new TypeError('min and max must be finite numbers');
  if (max <= min) throw new RangeError('maxExclusive must be greater than minInclusive');
  // produce integer in [min, max)
  const span = max - min;
  return min + Math.floor(rand() * span);
}
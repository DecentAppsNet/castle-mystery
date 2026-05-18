// Follow test conventions from CONTRIBUTING.md when editing this file.
import { expect, it, describe, beforeEach } from 'vitest';
import { setSeed, clearSeed, rand, randInRange, randIntInRange } from '../randUtil';

describe('randUtil.ts', () => {
  beforeEach(() => {
    clearSeed();
  });

  it('rand() without seed returns numbers in [0,1) for 100 calls', () => {
    for (let i = 0; i < 100; ++i) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('rand() with seed returns numbers in [0,1) for 100 calls', () => {
    setSeed(12345);
    for (let i = 0; i < 100; ++i) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('setting the same seed produces the same sequence', () => {
    const seed = 42;
    setSeed(seed);
    const seq1: number[] = [];
    for (let i = 0; i < 100; ++i) seq1.push(rand());
    setSeed(seed);
    const seq2: number[] = [];
    for (let i = 0; i < 100; ++i) seq2.push(rand());
    expect(seq1).toEqual(seq2);
  });

  it('randInRange returns values in [min,max) without seed', () => {
    const min = -5.5, max = 10.2;
    for (let i = 0; i < 100; ++i) {
      const v = randInRange(min, max);
      expect(v).toBeGreaterThanOrEqual(min);
      expect(v).toBeLessThan(max);
    }
  });

  it('randIntInRange returns integers in [min,max) without seed', () => {
    const min = -10, max = 10;
    for (let i = 0; i < 100; ++i) {
      const v = randIntInRange(min, max);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(min);
      expect(v).toBeLessThan(max);
    }
  });

  it('randInRange is deterministic with seed', () => {
    const seed = 12345;
    setSeed(seed);
    const seq1: number[] = [];
    for (let i = 0; i < 50; ++i) seq1.push(randInRange(0, 1));

    setSeed(seed);
    const seq2: number[] = [];
    for (let i = 0; i < 50; ++i) seq2.push(randInRange(0, 1));

    expect(seq1).toEqual(seq2);
  });

  it('randIntInRange is deterministic with seed', () => {
    const seed = 12345;
    setSeed(seed);
    const seq1i: number[] = [];
    for (let i = 0; i < 50; ++i) seq1i.push(randIntInRange(0, 100));

    setSeed(seed);
    const seq2i: number[] = [];
    for (let i = 0; i < 50; ++i) seq2i.push(randIntInRange(0, 100));

    expect(seq1i).toEqual(seq2i);
  });
});

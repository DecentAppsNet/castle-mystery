import { describe, expect, it } from 'vitest';
import { getPieceFlairProfile } from '../pieceFlairUtil';

describe('pieceFlairUtil', () => {
  describe('getPieceFlairProfile()', () => {
    it('provides nine distinct profiles with paired hex colors', () => {
      const profiles = Array.from({ length:9 }, (_, styleNo) => getPieceFlairProfile(styleNo));
      expect(new Set(profiles).size).toBe(9);
      expect(new Set(profiles.map(profile => profile.pieceColor)).size).toBe(9);
      expect(new Set(profiles.map(profile => profile.pieceSlotColor)).size).toBe(9);
      profiles.forEach(profile => {
        expect(profile.borderPolygon.length).toBeGreaterThanOrEqual(2);
        expect(profile.pieceColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(profile.pieceSlotColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(profile.pieceColor).not.toBe(profile.pieceSlotColor);
      });
    });

    it('preserves reserved category profiles', () => {
      expect(getPieceFlairProfile(0).borderPolygon[0]).toEqual([0, 0]);
      expect(getPieceFlairProfile(1).borderPolygon[1]).toEqual([0, .3]);
      expect(getPieceFlairProfile(2).borderPolygon[1]).toEqual([0, .25]);
    });

    it('starts wrapping at the first custom profile', () => {
      expect(getPieceFlairProfile(9)).toBe(getPieceFlairProfile(3));
    });

    it('reaches the last custom profile before wrapping again', () => {
      expect(getPieceFlairProfile(14)).toBe(getPieceFlairProfile(8));
    });

    it('wraps repeatedly without reusing reserved profiles', () => {
      const actual = Array.from({ length:22 }, (_, styleNo) => getPieceFlairProfile(styleNo));
      const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3];
      expect(actual).toEqual(expected.map(styleNo => getPieceFlairProfile(styleNo)));
    });
  });
});
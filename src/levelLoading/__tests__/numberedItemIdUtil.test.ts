import { describe, expect, it } from 'vitest';
import { getNumberedItemBaseId } from '../numberedItemIdUtil';

describe('numberedItemIdUtil', () => {
  describe('getNumberedItemBaseId()', () => {
    it('recognizes a terminal numbered suffix on a multiword base', () => {
      expect(getNumberedItemBaseId('wooden chair #20')).toBe('wooden chair');
    });

    it('allows zero', () => {
      expect(getNumberedItemBaseId('chair #0')).toBe('chair');
    });

    it('allows leading zeros', () => {
      expect(getNumberedItemBaseId('chair #01')).toBe('chair');
    });

    it('does not impose a numeric limit', () => {
      expect(getNumberedItemBaseId('chair #99999999999999999999999999999999')).toBe('chair');
    });

    it('requires a separating space', () => {
      expect(getNumberedItemBaseId('chair#1')).toBeNull();
    });

    it('requires at least one digit', () => {
      expect(getNumberedItemBaseId('chair #')).toBeNull();
    });

    it('rejects signed suffixes', () => {
      expect(getNumberedItemBaseId('chair #-1')).toBeNull();
    });

    it('rejects decimal suffixes', () => {
      expect(getNumberedItemBaseId('chair #1.5')).toBeNull();
    });

    it('requires the suffix to end the ID', () => {
      expect(getNumberedItemBaseId('chair #1 extra')).toBeNull();
    });

    it('accepts only ASCII digits', () => {
      expect(getNumberedItemBaseId('chair #\u0661')).toBeNull();
    });

    it('does not collapse existing whitespace', () => {
      expect(getNumberedItemBaseId('chair  #1')).toBeNull();
    });

    it('rejects recursive numbered suffixes', () => {
      expect(getNumberedItemBaseId('chair #2 #3')).toBeNull();
    });

    it('rejects IDs without a suffix', () => {
      expect(getNumberedItemBaseId('chair')).toBeNull();
    });
  });
});
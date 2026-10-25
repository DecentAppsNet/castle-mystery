import { describe, expect, it } from 'vitest';
import { getBodyImageAssetUrl, getClozeImageCandidateUrls } from '../imageUrlUtil';

describe('imageUrlUtil', () => {
  describe('getBodyImageAssetUrl()', () => {
    it('resolves a filename to the canonical body asset bucket', () => {
      expect(getBodyImageAssetUrl('head.png')).toBe('/assets/bodies/head.png');
    });

    it('rejects path-like authored values', () => {
      expect(() => getBodyImageAssetUrl('../head.png')).toThrow();
    });
  });

  describe('getClozeImageCandidateUrls()', () => {
    it('tries the conclusion bucket before the body bucket', () => {
      expect(getClozeImageCandidateUrls('head.png')).toEqual([
        '/assets/conclusions/head.png', '/assets/bodies/head.png'
      ]);
    });
  });
});
// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { findImportedFilenames, parseLevelManifestFilenames } from '../levelFileUtil.ts';

describe('levelFileUtil', () => {
  describe('findImportedFilenames()', () => {
    it('parses the general imports list', () => {
      expect(findImportedFilenames('# general\n\n* imports=items.md | characters.md\n')).toEqual(['items.md', 'characters.md']);
    });

    it('returns empty when there is no imports entry', () => {
      expect(findImportedFilenames('# general\n\n* title=Test\n')).toEqual([]);
    });
  });

  describe('parseLevelManifestFilenames()', () => {
    it('extracts level filenames from the levels section bullets', () => {
      expect(parseLevelManifestFilenames('# levels\n\n* 00_prologue.md\n* 01_birth_of_constantine.md\n'))
        .toEqual(['00_prologue.md', '01_birth_of_constantine.md']);
    });
  });
});

// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, it } from 'vitest';

import sayActivityForUnplacedText from './fixtures/say-activity-for-unplaced.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';

describe('say activity for unplaced', () => {
  describe('loadLevelFromText()', () => {
    it.skip('loads the self-contained fraternity fixture without throwing', () => {
      loadLevelFromText(sayActivityForUnplacedText, 'say-activity-for-unplaced.md');
    });
  });
});
import { test, expect } from 'vitest';

import defaultLevelText from './fixtures/default-level.md?raw';
import { loadLevelForTest } from './testLevelUtil';

// Temporary test file used during development. To be deleted later.

test('load default level', () => {
  const { level, errors } = loadLevelForTest(defaultLevelText, 'default-level.md');
  expect(errors.describeErrors()).toEqual('');
  expect(level).not.toBeNull();
});
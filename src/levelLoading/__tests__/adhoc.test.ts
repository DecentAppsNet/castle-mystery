/*
This file is meant to be used to test level-loading of the public/levels/adhoc.md file. The rules for what tests can live here are different
than what is specified in CONTRIBUTING.md - it's the only place where we allow a level file from the public folder to be loaded.

It's not actually very important to test that adhoc.md loads. That file is for adhoc testing both in the app itself and via the unit test below.
The contents of adhoc.md can be changed arbitrarily to whatever is useful to test. There are no durable contracts in this file other than, yeah,
I do generally want adhoc.md to be loadable.

If a valuable test case is discovered in adhoc testing, it will move to another file and have its own fixture that is not hosted 
from public/levels.
*/

import { afterEach, expect, it, vi } from 'vitest';

import { loadLevelFromUrl } from '..';
import adhocLevelText from '../../../public/levels/adhoc.md?raw';
import charactersLevelText from '../../../public/levels/characters.md?raw';
import itemsLevelText from '../../../public/levels/items.md?raw';
import roomStylesLevelText from '../../../public/levels/roomStyles.md?raw';

afterEach(() => {
	vi.unstubAllGlobals();
});

it.skip('loads the Adhoc level', async () => {
	const levelTextByFilename:Record<string, string> = { // Coupled to expected filenames for imports within level files.
		'adhoc.md':adhocLevelText,
		'characters.md':charactersLevelText,
		'items.md':itemsLevelText,
		'roomStyles.md':roomStylesLevelText
	};
	vi.stubGlobal('fetch', async (url:string) => {
		const filename = url.split('/').pop() ?? '';
		const text = levelTextByFilename[filename];
		if (!text) throw new Error(`Unexpected level URL: ${url}`);
		return { text:async () => text };
	});
	vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

	const { level, errors } = await loadLevelFromUrl('adhoc.md');

  expect(errors.describeErrors()).toEqual('');
	expect(level).not.toBeNull();
});
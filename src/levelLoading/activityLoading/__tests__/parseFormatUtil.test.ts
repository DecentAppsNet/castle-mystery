// Follow test conventions from CONTRIBUTING.md when editing this file.

import { describe, it, expect } from 'vitest';

import {
	makeIdentifier,
	makeLiteral,
	makeNumber,
	makeOptions,
	makeSequence,
	makeText,
	makeVariableLiteral,
	makeVerb,
	describeParseFormat,
	createParseFormat,
} from '../parseFormatUtil';
import { createAppearsParseFormat } from '../activitySchedulers/appearsScheduler';
import { createAtActivityParseFormat } from '../activitySchedulers/atScheduler'
import { createBecomesParseFormat } from '../activitySchedulers/becomesScheduler';
import { createDropsParseFormat } from '../activitySchedulers/dropsScheduler';
import { createEmitsParseFormat } from '../activitySchedulers/emitsScheduler';
import { createFacesParseFormat } from '../activitySchedulers/facesScheduler';
import { createGivesParseFormat } from '../activitySchedulers/givesScheduler';
import { createHideParseFormat } from '../activitySchedulers/hideScheduler';
import { createKneelsParseFormat } from '../activitySchedulers/kneelsScheduler';
import { createLaysParseFormat } from '../activitySchedulers/laysScheduler';
import { createLocksParseFormat } from '../activitySchedulers/locksScheduler';
import { createSaysParseFormat } from '../activitySchedulers/saysScheduler';
import { createShowParseFormat } from '../activitySchedulers/showScheduler';
import { createSitsParseFormat } from '../activitySchedulers/sitsScheduler';
import { createStandsParseFormat } from '../activitySchedulers/standsScheduler';
import { createTakesParseFormat } from '../activitySchedulers/takesScheduler';
import { createUnlocksParseFormat } from '../activitySchedulers/unlocksScheduler';
import { createWaitsParseFormat } from '../activitySchedulers/waitsScheduler';


import ParseFormat from '../types/ParseFormat';

describe('parseFormatUtil', () => {
	describe('describeParseFormat() validation', () => {
		it('does not throw for a valid parse format', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeVerb('appears'),
				makeLiteral('as', true),
				makeIdentifier('skinId', 'SkinId'),
			]);
			const parseFormat = createParseFormat(rootParseStep);

			expect(() => describeParseFormat(parseFormat)).not.toThrow();
		});

		it('throws if activityVerb is empty', () => {
			const parseFormat:ParseFormat = {
				activityVerb:'',
				rootParseStep:makeVerb('appears'),
			};

			expect(() => describeParseFormat(parseFormat)).toThrow('Missing activity verb.');
		});

		it('throws if rootParseStep is invalid', () => {
			const parseFormat:ParseFormat = {
				activityVerb:'appears',
				rootParseStep:makeOptions([makeLiteral('appears')]),
			};

			expect(() => describeParseFormat(parseFormat)).toThrow();
		});
	});

	describe('createParseFormat()', () => {
		it('extracts a verb literal at root', () => {
			expect(createParseFormat(makeVerb('appears')).activityVerb).toBe('appears');
		});

		it('extracts a verb literal from a root sequence', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeVerb('waits'),
				makeNumber('seconds', true),
			]);

			expect(createParseFormat(rootParseStep)).toEqual({ activityVerb:'waits', rootParseStep });
		});

		it('throws if rootParseStep is not a literal or sequence', () => {
			const rootParseStep = makeOptions([makeLiteral('left'), makeLiteral('right')]);

			expect(() => createParseFormat(rootParseStep)).toThrow('root can only be verb or a sequence');
		});

		it('throws if root sequence does not contain a verb literal', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeText(),
			]);

			expect(() => createParseFormat(rootParseStep)).toThrow('Could not find verb');
		});

		it('throws if root literal is not a verb literal', () => {
			const rootParseStep = makeVariableLiteral('characterId', 'samuel');

			expect(() => createParseFormat(rootParseStep)).toThrow('Could not find verb');
		});
	});

	describe('describeParseFormat()', () => {
		it('describes a root verb literal', () => {
			const parseFormat = createParseFormat(makeVerb('@'));

			expect(describeParseFormat(parseFormat)).toBe('Timestamp `@`');
		});

		it('describes an identifier step', () => {
			const parseFormat = createParseFormat(makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeVerb('appears'),
			]));

			expect(describeParseFormat(parseFormat)).toBe('Timestamp [CharacterId] `appears`');
		});

		it('describes a literal step', () => {
			const parseFormat = createParseFormat(makeSequence([
				makeVerb('gives'),
				makeLiteral('to'),
			]));

			expect(describeParseFormat(parseFormat)).toBe('Timestamp `gives` `to`');
		});

		it('describes a number step', () => {
			const parseFormat = createParseFormat(makeSequence([
				makeVerb('waits'),
				makeNumber('seconds', true),
			]));

			expect(describeParseFormat(parseFormat)).toBe('Timestamp `waits` [Seconds]');
		});

		it('describes an options step', () => {
			const parseFormat = createParseFormat(makeSequence([
				makeVerb('faces'),
				makeOptions([makeLiteral('left'), makeLiteral('right')], true),
			]));

			expect(describeParseFormat(parseFormat)).toBe('Timestamp `faces` [`left`|`right`]');
		});

		it('describes a sequence step', () => {
			const parseFormat = createParseFormat(makeSequence([
				makeVerb('says'),
				makeSequence([makeLiteral('to'), makeIdentifier('toCharacterId', 'CharacterId')], true),
			]));

			expect(describeParseFormat(parseFormat)).toBe('Timestamp `says` [`to` CharacterId]');
		});

		it('describes a text step', () => {
			const parseFormat = createParseFormat(makeSequence([
				makeVerb('emits'),
				makeText(),
			]));

			expect(describeParseFormat(parseFormat)).toBe('Timestamp `emits` "Text"');
		});

		describe('activity parse formats', () => {
			it('describes the @ activity parse format', () => {
				expect(describeParseFormat(createAtActivityParseFormat())).toBe('Timestamp [CharacterId] `@` RoomId [`(` HorizontalTarget `%` `)`]');
			});

			it('describes the appears activity parse format', () => {
				expect(describeParseFormat(createAppearsParseFormat())).toBe('Timestamp [CharacterId] `appears` [`as`] {SkinName|`default`}');
			});

			it('describes the becomes activity parse format', () => {
				expect(describeParseFormat(createBecomesParseFormat())).toBe('Timestamp ItemId `becomes` ItemId');
			});

			it('describes the drops activity parse format', () => {
				expect(describeParseFormat(createDropsParseFormat())).toBe('Timestamp [CharacterId] `drops` ItemId [{`at`|`on`|`onto`|`to`} {ItemId|CharacterId}]');
			});

			it('describes the emits activity parse format', () => {
				expect(describeParseFormat(createEmitsParseFormat())).toBe('Timestamp [CharacterId|ItemId] `emits` "Text" [`loudly`]');
			});

			it('describes the faces activity parse format', () => {
				expect(describeParseFormat(createFacesParseFormat())).toBe('Timestamp [CharacterId] `faces` {`left`|`right`|CharacterId|ItemId}');
			});

			it('describes the gives activity parse format', () => {
				expect(describeParseFormat(createGivesParseFormat())).toBe('Timestamp [CharacterId] `gives` ItemId `to` CharacterId');
			});

			it('describes the hide activity parse format', () => {
				expect(describeParseFormat(createHideParseFormat())).toBe('Timestamp `hide` {CharacterId|ItemId}');
			});

			it('describes the kneels activity parse format', () => {
				expect(describeParseFormat(createKneelsParseFormat())).toBe('Timestamp [CharacterId] `kneels` [{`on`|`above`|`in`|`over`|`at`} ItemId]');
			});

			it('describes the lays activity parse format', () => {
				expect(describeParseFormat(createLaysParseFormat())).toBe('Timestamp [CharacterId] `lays` [{`on`|`above`|`in`|`over`|`at`} ItemId]');
			});

			it('describes the locks activity parse format', () => {
				expect(describeParseFormat(createLocksParseFormat())).toBe('Timestamp [CharacterId] `locks` RoomId');
			});

			it('describes the says activity parse format', () => {
				expect(describeParseFormat(createSaysParseFormat())).toBe('Timestamp [CharacterId] `says` "Text" [`to` CharacterId]');
			});

			it('describes the show activity parse format', () => {
				expect(describeParseFormat(createShowParseFormat())).toBe('Timestamp `show` {CharacterId|ItemId}');
			});

			it('describes the sits activity parse format', () => {
				expect(describeParseFormat(createSitsParseFormat())).toBe('Timestamp [CharacterId] `sits` [{`on`|`above`|`in`|`over`|`at`} ItemId]');
			});

			it('describes the stands activity parse format', () => {
				expect(describeParseFormat(createStandsParseFormat())).toBe('Timestamp [CharacterId] `stands` [{`on`|`above`|`in`|`over`|`at`} ItemId]');
			});

			it('describes the takes activity parse format', () => {
				expect(describeParseFormat(createTakesParseFormat())).toBe('Timestamp [CharacterId] `takes` ItemId [{`in`|`into`} {`left hand`|`right hand`|`inventory`}]');
			});

			it('describes the unlocks activity parse format', () => {
				expect(describeParseFormat(createUnlocksParseFormat())).toBe('Timestamp [CharacterId] `unlocks` RoomId');
			});

			it('describes the waits activity parse format', () => {
				expect(describeParseFormat(createWaitsParseFormat())).toBe('Timestamp [CharacterId] `waits` [Seconds]');
			});
		});
	});
});

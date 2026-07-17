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
} from '../activityParserApi';
import { findVerbText, throwIfParseFormatInvalid, throwIfParseStepsInvalid } from '../parseFormatUtil';

import ParseFormat from '../types/ParseFormat';
import ParseStep from '../types/ParseStep';

function _expected(rootParseStep:ParseStep):ParseFormat {
	const activityVerb = findVerbText(rootParseStep);
	if (!activityVerb) throw Error('debug error in _expected()');
	return { activityVerb, rootParseStep };
}

describe('parseFormatUtil', () => {
	describe('throwIfParseFormatInvalid()', () => {
		it('does not throw for a valid parse format', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeVerb('appears'),
				makeLiteral('as', true),
				makeIdentifier('appearanceId', 'AppearanceId'),
			]);
			const parseFormat = _expected(rootParseStep);

			expect(() => throwIfParseFormatInvalid(parseFormat)).not.toThrow();
		});

		it('throws if activityVerb is empty', () => {
			const parseFormat:ParseFormat = {
				activityVerb:'',
				rootParseStep:makeVerb('appears'),
			};

			expect(() => throwIfParseFormatInvalid(parseFormat)).toThrow('Missing activity verb.');
		});

		it('throws if rootParseStep is invalid', () => {
			const parseFormat:ParseFormat = {
				activityVerb:'appears',
				rootParseStep:makeOptions([makeLiteral('appears')]),
			};

			expect(() => throwIfParseFormatInvalid(parseFormat)).toThrow();
		});
	});

	describe('throwIfParseStepsInvalid()', () => {
		it('does not throw for a verb literal at root', () => {
			expect(() => throwIfParseStepsInvalid(makeVerb('appears'))).not.toThrow();
		});

		it('does not throw for a root sequence containing a verb literal', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeVerb('waits'),
				makeNumber('seconds', true),
			]);

			expect(() => throwIfParseStepsInvalid(rootParseStep)).not.toThrow();
		});

		it('throws if rootParseStep is not a literal or sequence', () => {
			const rootParseStep = makeOptions([makeLiteral('left'), makeLiteral('right')]);

			expect(() => throwIfParseStepsInvalid(rootParseStep)).toThrow('root can only be verb or a sequence');
		});

		it('throws if root sequence does not contain a verb literal', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeText(),
			]);

			expect(() => throwIfParseStepsInvalid(rootParseStep)).toThrow('Could not find verb');
		});

		it('throws if root literal is not a verb literal', () => {
			const rootParseStep = makeVariableLiteral('characterId', 'samuel');

			expect(() => throwIfParseStepsInvalid(rootParseStep)).toThrow('Could not find verb');
		});
	});

	describe('findVerbText()', () => {
		it('returns verb text when rootParseStep is a verb literal', () => {
			expect(findVerbText(makeVerb('appears'))).toBe('appears');
		});

		it('returns verb text when root sequence contains a verb literal', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeVerb('interrupts'),
				makeText(),
			]);

			expect(findVerbText(rootParseStep)).toBe('interrupts');
		});

		it('returns null when root sequence does not contain a verb literal', () => {
			const rootParseStep = makeSequence([
				makeIdentifier('characterId', 'CharacterId', true),
				makeNumber('seconds', true),
			]);

			expect(findVerbText(rootParseStep)).toBeNull();
		});

		it('returns null when rootParseStep is not a literal or sequence containing a verb', () => {
			const rootParseStep = makeOptions([makeLiteral('left'), makeLiteral('right')]);

			expect(findVerbText(rootParseStep)).toBeNull();
		});
	});
});

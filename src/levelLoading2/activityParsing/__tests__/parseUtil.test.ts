// Follow test conventions from CONTRIBUTING.md when editing this file.

import { beforeEach, describe, expect, it } from 'vitest';

import { createActivityParsingRules } from '../parsingRulesUtil';
import {
  createParseFormat,
  makeIdentifier,
  makeLiteral,
  makeNumber,
  makeOptions,
  makeSequence,
  makeText,
  makeVariableLiteral,
  makeVariableOptions,
  makeVerb,
  tryParseActivity,
} from '../activityParserApi';
import ActivityParsingRules from '../types/ActivityParsingRules';

const APPEARANCE_IDS = ['guard uniform', 'royal robes', 'tiara'];
const CHARACTER_IDS = ['samuel', 'lady beatrice'];
const ITEM_IDS = ['apple', 'golden apple'];
const ROOM_IDS = ['master bedroom', 'kitchen'];

describe('parseUtil', () => {
	describe('tryParseActivity()', () => {
    let sharedRules: ActivityParsingRules;

    beforeEach(() => {
      sharedRules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS);
    });

    describe('basic parsing', () => {
      it('fails when no activity text follows the timestamp token', () => {
        expect(tryParseActivity('samuel', sharedRules)).toContain('timestamp followed by activity text');
      });

      it('fails when the first token is not a valid timestamp', () => {
        const error = tryParseActivity('says "hello"', sharedRules);
        expect(error).toContain('does not follow expected timestamp format');
      });

      it('fails when the activity text has no known verb', () => {
        const error = tryParseActivity(': "hello"', sharedRules);
        expect(error).toContain(`didn't include a known verb`);
      });
    });

    describe('literal parsing', () => {
      it('fails when a required literal does not match', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('bows'),
          makeLiteral('deeply')
        ])));

        const error = tryParseActivity(': samuel bows insincerely', rules);
        expect(error).toContain('Expected "deeply" after "bows".');
      });

      it('skips an optional literal when it is absent', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('appears'),
          makeLiteral('as', true),
          makeIdentifier('appearanceId', 'AppearanceId'),
        ])));

        expect(tryParseActivity(': samuel appears guard uniform', rules)).toMatchObject({
          parts: {
            appearanceId: 'guard uniform',
            characterId: 'samuel',
            verb: 'appears',
          },
        });
      });

      it('stores the value of an optional variable literal when it matches', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('emits'),
          makeText('speech'),
          makeVariableLiteral('volume', 'loudly', true),
        ])));

        expect(tryParseActivity(': samuel emits "hello" loudly', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            speech: 'hello',
            verb: 'emits',
            volume: 'loudly',
          },
        });
      });
    });

    describe('number parsing', () => {
      it('parses a required number into a numeric part value', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('waits'),
          makeNumber('seconds'),
        ])));

        expect(tryParseActivity(': samuel waits 3.5', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            seconds: 3.5,
            verb: 'waits',
          },
        });
      });

      it('skips an optional number when it is absent', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('waits'),
          makeNumber('seconds', true),
        ])));

        expect(tryParseActivity(': samuel waits', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'waits',
          },
        });
      });

      it('fails when a required number token is not numeric', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('waits'),
          makeNumber('seconds'),
        ])));

        const error = tryParseActivity(': samuel waits soon', rules);
        expect(error).toContain('Expected a number after "waits".');
      });
    });

    describe('text parsing', () => {
      it('parses required quote-enclosed text into the requested variable', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('says'),
          makeText('speech'),
        ])));

        expect(tryParseActivity(': samuel says "hello, there"', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            speech: 'hello, there',
            verb: 'says',
          },
        });
      });

      it('skips optional text when it is absent', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('thinks'),
          makeText('thought', true),
        ])));

        expect(tryParseActivity(': samuel thinks', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'thinks',
          },
        });
      });

      it('fails when required text is not quote-enclosed', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('says'),
          makeText('speech'),
        ])));

        const error = tryParseActivity(': samuel says hello', rules);
        expect(error).toContain('Expected quote-enclosed text after "says".');
      });
    });

    describe('option parsing', () => {
      it('matches a non-variable option without adding an option part', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('faces'),
          makeOptions([
            makeLiteral('left'),
            makeLiteral('right'),
          ]),
        ])));

        expect(tryParseActivity(': samuel faces left', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'faces',
          },
        });
      });

      it('stores the chosen value for variable options', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('turns'),
          makeVariableOptions('direction', [
            makeLiteral('left'),
            makeLiteral('right'),
          ]),
        ])));

        expect(tryParseActivity(': samuel turns right', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            direction: 'right',
            verb: 'turns',
          },
        });
      });

      it('skips optional options when they are absent', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('gestures'),
          makeOptions([
            makeLiteral('left'),
            makeLiteral('right'),
          ], true),
        ])));

        expect(tryParseActivity(': samuel gestures', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'gestures',
          },
        });
      });
    });

    describe('sequence parsing', () => {
      it('parses a required child sequence as a unit', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('greets'),
          makeSequence([
            makeIdentifier('toCharacterId', 'CharacterId'),
            makeLiteral('politely'),
          ]),
        ])));

        expect(tryParseActivity(': samuel greets lady beatrice politely', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            toCharacterId: 'lady beatrice',
            verb: 'greets',
          },
        });
      });

      it('skips an optional child sequence when it is absent', () => {
        const rules = createActivityParsingRules(CHARACTER_IDS, ROOM_IDS, ITEM_IDS, APPEARANCE_IDS, createParseFormat(makeSequence([
          makeIdentifier('characterId', 'CharacterId'),
          makeVerb('says'),
          makeText('speech'),
          makeSequence([
            makeLiteral('to'),
            makeIdentifier('toCharacterId', 'CharacterId'),
          ], true),
        ])));

        expect(tryParseActivity(': samuel says "hello"', rules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            speech: 'hello',
            verb: 'says',
          },
        });
      });
    });

    describe('@ activity parsing', () => {
      it('parses multi-word identifiers and an absolute timestamp', () => {
        expect(tryParseActivity('1:02:03 lady beatrice @ master bedroom', sharedRules)).toEqual({
          duration: null,
          parts: {
            characterId: 'lady beatrice',
            roomId: 'master bedroom',
            verb: '@',
          },
          startTime: 3723000,
          verb: '@',
        });
      });

      it('parses when the optional character id is omitted', () => {
        expect(tryParseActivity(': @ master bedroom', sharedRules)).toMatchObject({
          parts: {
            roomId: 'master bedroom',
            verb: '@',
          },
          verb: '@',
        });
      });
    });

    describe('appears activity parsing', () => {
      it('parses with character id and with "as"', () => {
        expect(tryParseActivity(': samuel appears as guard uniform', sharedRules)).toMatchObject({
          parts: {
            appearanceId: 'guard uniform',
            characterId: 'samuel',
            verb: 'appears',
          },
          verb: 'appears',
        });
      });

      it('parses with character id and without "as"', () => {
        expect(tryParseActivity(': samuel appears tiara', sharedRules)).toMatchObject({
          parts: {
            appearanceId: 'tiara',
            characterId: 'samuel',
            verb: 'appears',
          },
          verb: 'appears',
        });
      });

      it('parses without character id and with "as"', () => {
        expect(tryParseActivity(': appears as royal robes', sharedRules)).toMatchObject({
          parts: {
            appearanceId: 'royal robes',
            verb: 'appears',
          },
          verb: 'appears',
        });
      });

      it('parses without character id and without "as"', () => {
        expect(tryParseActivity(': appears guard uniform', sharedRules)).toMatchObject({
          parts: {
            appearanceId: 'guard uniform',
            verb: 'appears',
          },
          verb: 'appears',
        });
      });
    });

    describe('becomes activity parsing', () => {
      it('parses item to item transformations', () => {
        expect(tryParseActivity(': apple becomes golden apple', sharedRules)).toMatchObject({
          parts: {
            itemId: 'apple',
            toItemId: 'golden apple',
            verb: 'becomes',
          },
          verb: 'becomes',
        });
      });
    });

    describe('drops activity parsing', () => {
      it('parses with character id and no target sequence', () => {
        expect(tryParseActivity(': samuel drops apple', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'apple',
            verb: 'drops',
          },
          verb: 'drops',
        });
      });

      it('parses without character id and no target sequence', () => {
        expect(tryParseActivity(': drops apple', sharedRules)).toMatchObject({
          parts: {
            itemId: 'apple',
            verb: 'drops',
          },
          verb: 'drops',
        });
      });

      it('parses an "at" target item sequence', () => {
        expect(tryParseActivity(': samuel drops apple at golden apple', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'apple',
            toItemId: 'golden apple',
            verb: 'drops',
          },
          verb: 'drops',
        });
      });

      it('parses an "on" target character sequence', () => {
        expect(tryParseActivity(': drops apple on lady beatrice', sharedRules)).toMatchObject({
          parts: {
            itemId: 'apple',
            toCharacterId: 'lady beatrice',
            verb: 'drops',
          },
          verb: 'drops',
        });
      });

      it('parses an "onto" target item sequence', () => {
        expect(tryParseActivity(': samuel drops apple onto golden apple', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'apple',
            toItemId: 'golden apple',
            verb: 'drops',
          },
          verb: 'drops',
        });
      });

      it('parses a "to" target character sequence', () => {
        expect(tryParseActivity(': samuel drops apple to lady beatrice', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'apple',
            toCharacterId: 'lady beatrice',
            verb: 'drops',
          },
          verb: 'drops',
        });
      });
    });

    describe('emits activity parsing', () => {
      it('parses without a subject and without loudly', () => {
        expect(tryParseActivity(': emits "hello"', sharedRules)).toMatchObject({
          parts: {
            text: 'hello',
            verb: 'emits',
          },
          verb: 'emits',
        });
      });

      it('parses without a subject and with loudly', () => {
        expect(tryParseActivity(': emits "hello" loudly', sharedRules)).toMatchObject({
          parts: {
            isLoud: 'loudly',
            text: 'hello',
            verb: 'emits',
          },
          verb: 'emits',
        });
      });

      it('parses a character subject without loudly', () => {
        expect(tryParseActivity(': samuel emits "hello"', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            text: 'hello',
            verb: 'emits',
          },
          verb: 'emits',
        });
      });

      it('parses a character subject with loudly', () => {
        expect(tryParseActivity(': samuel emits "hello" loudly', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            isLoud: 'loudly',
            text: 'hello',
            verb: 'emits',
          },
          verb: 'emits',
        });
      });

      it('parses an item subject without loudly', () => {
        expect(tryParseActivity(': apple emits "hello"', sharedRules)).toMatchObject({
          parts: {
            itemId: 'apple',
            text: 'hello',
            verb: 'emits',
          },
          verb: 'emits',
        });
      });

      it('parses an item subject with loudly', () => {
        expect(tryParseActivity(': golden apple emits "hello" loudly', sharedRules)).toMatchObject({
          parts: {
            isLoud: 'loudly',
            itemId: 'golden apple',
            text: 'hello',
            verb: 'emits',
          },
          verb: 'emits',
        });
      });
    });

    describe('faces activity parsing', () => {
      it('parses with character id and the left option', () => {
        expect(tryParseActivity(': samuel faces left', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'faces',
          },
          verb: 'faces',
        });
      });

      it('parses without character id and the left option', () => {
        expect(tryParseActivity(': faces left', sharedRules)).toMatchObject({
          parts: {
            verb: 'faces',
          },
          verb: 'faces',
        });
      });

      it('parses with character id and the right option', () => {
        expect(tryParseActivity(': samuel faces right', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'faces',
          },
          verb: 'faces',
        });
      });

      it('parses without character id and the right option', () => {
        expect(tryParseActivity(': faces right', sharedRules)).toMatchObject({
          parts: {
            verb: 'faces',
          },
          verb: 'faces',
        });
      });

      it('parses with character id and a character target', () => {
        expect(tryParseActivity(': samuel faces lady beatrice', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            toCharacterId: 'lady beatrice',
            verb: 'faces',
          },
          verb: 'faces',
        });
      });

      it('parses without character id and a character target', () => {
        expect(tryParseActivity(': faces lady beatrice', sharedRules)).toMatchObject({
          parts: {
            toCharacterId: 'lady beatrice',
            verb: 'faces',
          },
          verb: 'faces',
        });
      });

      it('parses with character id and an item target', () => {
        expect(tryParseActivity(': samuel faces golden apple', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            toItemId: 'golden apple',
            verb: 'faces',
          },
          verb: 'faces',
        });
      });

      it('parses without character id and an item target', () => {
        expect(tryParseActivity(': faces apple', sharedRules)).toMatchObject({
          parts: {
            toItemId: 'apple',
            verb: 'faces',
          },
          verb: 'faces',
        });
      });
    });

    describe('gives activity parsing', () => {
      it('parses with character id', () => {
        expect(tryParseActivity(': samuel gives apple to lady beatrice', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'apple',
            toCharacterId: 'lady beatrice',
            verb: 'gives',
          },
          verb: 'gives',
        });
      });

      it('parses without character id', () => {
        expect(tryParseActivity(': gives golden apple to samuel', sharedRules)).toMatchObject({
          parts: {
            itemId: 'golden apple',
            toCharacterId: 'samuel',
            verb: 'gives',
          },
          verb: 'gives',
        });
      });
    });

    describe('hide activity parsing', () => {
      it('parses a character target', () => {
        expect(tryParseActivity(': hide samuel', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'hide',
          },
          verb: 'hide',
        });
      });

      it('parses an item target', () => {
        expect(tryParseActivity(': hide golden apple', sharedRules)).toMatchObject({
          parts: {
            itemId: 'golden apple',
            verb: 'hide',
          },
          verb: 'hide',
        });
      });
    });

    describe('interrupts activity parsing', () => {
      it('parses with character id and without a target sequence', () => {
        expect(tryParseActivity(': samuel interrupts "hello"', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            text: 'hello',
            verb: 'interrupts',
          },
          verb: 'interrupts',
        });
      });

      it('parses with character id and with a target sequence', () => {
        expect(tryParseActivity(': samuel interrupts "hello" to lady beatrice', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            text: 'hello',
            toCharacterId: 'lady beatrice',
            verb: 'interrupts',
          },
          verb: 'interrupts',
        });
      });

      it('parses without character id and without a target sequence', () => {
        expect(tryParseActivity(': interrupts "hello"', sharedRules)).toMatchObject({
          parts: {
            text: 'hello',
            verb: 'interrupts',
          },
          verb: 'interrupts',
        });
      });

      it('parses without character id and with a target sequence', () => {
        expect(tryParseActivity(': interrupts "hello" to samuel', sharedRules)).toMatchObject({
          parts: {
            text: 'hello',
            toCharacterId: 'samuel',
            verb: 'interrupts',
          },
          verb: 'interrupts',
        });
      });
    });

    describe('kneels activity parsing', () => {
      it('parses with character id', () => {
        expect(tryParseActivity(': samuel kneels', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'kneels',
          },
          verb: 'kneels',
        });
      });

      it('parses without character id', () => {
        expect(tryParseActivity(': kneels', sharedRules)).toMatchObject({
          parts: {
            verb: 'kneels',
          },
          verb: 'kneels',
        });
      });
    });

    describe('lays activity parsing', () => {
      it('parses with character id', () => {
        expect(tryParseActivity(': samuel lays', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'lays',
          },
          verb: 'lays',
        });
      });

      it('parses without character id', () => {
        expect(tryParseActivity(': lays', sharedRules)).toMatchObject({
          parts: {
            verb: 'lays',
          },
          verb: 'lays',
        });
      });
    });

    describe('locks activity parsing', () => {
      it('parses with character id', () => {
        expect(tryParseActivity(': samuel locks kitchen', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            roomId: 'kitchen',
            verb: 'locks',
          },
          verb: 'locks',
        });
      });

      it('parses without character id', () => {
        expect(tryParseActivity(': locks master bedroom', sharedRules)).toMatchObject({
          parts: {
            roomId: 'master bedroom',
            verb: 'locks',
          },
          verb: 'locks',
        });
      });
    });

    describe('says activity parsing', () => {
      it('parses with character id and without a target sequence', () => {
        expect(tryParseActivity(': samuel says "hello"', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            text: 'hello',
            verb: 'says',
          },
          verb: 'says',
        });
      });

      it('parses with character id and with a target sequence', () => {
        expect(tryParseActivity(': samuel says "hello" to lady beatrice', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            text: 'hello',
            toCharacterId: 'lady beatrice',
            verb: 'says',
          },
          verb: 'says',
        });
      });

      it('parses without character id and without a target sequence', () => {
        expect(tryParseActivity(': says "hello"', sharedRules)).toMatchObject({
          parts: {
            text: 'hello',
            verb: 'says',
          },
          verb: 'says',
        });
      });

      it('parses without character id and with a target sequence', () => {
        expect(tryParseActivity(': says "Hello, Sammy!" to samuel', sharedRules)).toMatchObject({
          parts: {
            text: 'Hello, Sammy!',
            toCharacterId: 'samuel',
            verb: 'says',
          },
          verb: 'says',
        });
      });
    });

    describe('show activity parsing', () => {
      it('parses a character target', () => {
        expect(tryParseActivity(': show samuel', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'show',
          },
          verb: 'show',
        });
      });

      it('parses an item target', () => {
        expect(tryParseActivity(': show golden apple', sharedRules)).toMatchObject({
          parts: {
            itemId: 'golden apple',
            verb: 'show',
          },
          verb: 'show',
        });
      });
    });

    describe('sits activity parsing', () => {
      it('parses with character id', () => {
        expect(tryParseActivity(': samuel sits', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'sits',
          },
          verb: 'sits',
        });
      });

      it('parses without character id', () => {
        expect(tryParseActivity(': sits', sharedRules)).toMatchObject({
          parts: {
            verb: 'sits',
          },
          verb: 'sits',
        });
      });
    });

    describe('stands activity parsing', () => {
      it('parses with character id', () => {
        expect(tryParseActivity(': samuel stands', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'stands',
          },
          verb: 'stands',
        });
      });

      it('parses without character id', () => {
        expect(tryParseActivity(': stands', sharedRules)).toMatchObject({
          parts: {
            verb: 'stands',
          },
          verb: 'stands',
        });
      });
    });

    describe('takes activity parsing', () => {
      it('parses with character id and without a target sequence', () => {
        expect(tryParseActivity(': samuel takes apple', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'apple',
            verb: 'takes',
          },
          verb: 'takes',
        });
      });

      it('parses without character id and without a target sequence', () => {
        expect(tryParseActivity(': takes golden apple', sharedRules)).toMatchObject({
          parts: {
            itemId: 'golden apple',
            verb: 'takes',
          },
          verb: 'takes',
        });
      });

      it('parses an "in left hand" target sequence', () => {
        expect(tryParseActivity(': samuel takes apple in left hand', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'apple',
            verb: 'takes',
          },
          verb: 'takes',
        });
      });

      it('parses an "into right hand" target sequence', () => {
        expect(tryParseActivity(': takes apple into right hand', sharedRules)).toMatchObject({
          parts: {
            itemId: 'apple',
            verb: 'takes',
          },
          verb: 'takes',
        });
      });

      it('parses an "in inventory" target sequence', () => {
        expect(tryParseActivity(': samuel takes golden apple in inventory', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            itemId: 'golden apple',
            verb: 'takes',
          },
          verb: 'takes',
        });
      });
    });

    describe('unlocks activity parsing', () => {
      it('parses with character id', () => {
        expect(tryParseActivity(': samuel unlocks kitchen', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            roomId: 'kitchen',
            verb: 'unlocks',
          },
          verb: 'unlocks',
        });
      });

      it('parses without character id', () => {
        expect(tryParseActivity(': unlocks master bedroom', sharedRules)).toMatchObject({
          parts: {
            roomId: 'master bedroom',
            verb: 'unlocks',
          },
          verb: 'unlocks',
        });
      });
    });

    describe('waits activity parsing', () => {
      it('parses with character id and with seconds', () => {
        expect(tryParseActivity(': samuel waits 3.5', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            seconds: 3.5,
            verb: 'waits',
          },
          verb: 'waits',
        });
      });

      it('parses with character id and without seconds', () => {
        expect(tryParseActivity(': samuel waits', sharedRules)).toMatchObject({
          parts: {
            characterId: 'samuel',
            verb: 'waits',
          },
          verb: 'waits',
        });
      });

      it('parses without character id and with seconds', () => {
        expect(tryParseActivity(': waits 2', sharedRules)).toMatchObject({
          parts: {
            seconds: 2,
            verb: 'waits',
          },
          verb: 'waits',
        });
      });

      it('parses without character id and without seconds', () => {
        expect(tryParseActivity(': waits', sharedRules)).toMatchObject({
          parts: {
            verb: 'waits',
          },
          verb: 'waits',
        });
      });
    });
	});
});
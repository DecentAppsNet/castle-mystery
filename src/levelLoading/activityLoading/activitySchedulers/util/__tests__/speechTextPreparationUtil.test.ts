import { describe, expect, it } from 'vitest';

import { PreparedAnimationText } from '@/game/textAnimations/types/PreparedAnimationText';
import Activity from '@/levelLoading/activityLoading/types/Activity';
import { ErrorCollector } from '@/levelLoading/errorCollection';
import { prepareSpeechText } from '../speechTextPreparationUtil';

function _createContext(text:string) {
  const activity:Activity = {
    lineI:0, verb:'says', startTime:0, endTime:null,
    busyCharacterIds:[], busyItemIds:[], parts:{ characterId:'sam', text }, nextActivity:null
  };
  const errors = new ErrorCollector(text, [{ filename:'imported-speech.md', lineNo:73 }]);
  return { activity, errors };
}

function _expectPreparedText(text:string, expected:PreparedAnimationText) {
  const { activity, errors } = _createContext(text);
  expect(prepareSpeechText(text, activity, errors)).toEqual(expected);
  expect(errors.count).toBe(0);
  expect(errors.describeErrors()).toBe('');
}

function _expectInvalidText(text:string, message:string) {
  const { activity, errors } = _createContext(text);
  expect(prepareSpeechText(text, activity, errors)).toBeNull();
  expect(errors.count).toBe(1);
  expect(errors.describeErrors()).toBe(`imported-speech.md:73:0: ${message}`);
}

describe('speechTextPreparationUtil', () => {
  describe('prepareSpeechText()', () => {
    it('preserves plain text without preparing unmarked graphemes', () => {
      _expectPreparedText('It will be your doom.', { plainText:'It will be your doom.', spans:[] });
    });

    it('accepts empty text', () => {
      _expectPreparedText('', { plainText:'', spans:[] });
    });

    it('prepares a single span with visible-text offsets', () => {
      _expectPreparedText('Your [tense]doom[/].', { plainText:'Your doom.', spans:[{
        name:'tense', startUtf16Offset:5, endUtf16Offset:9, text:'doom', graphemes:['d', 'o', 'o', 'm']
      }] });
    });

    it('prepares adjacent spans separately', () => {
      _expectPreparedText('[tense]A[/][tense]V[/]', { plainText:'AV', spans:[
        { name:'tense', startUtf16Offset:0, endUtf16Offset:1, text:'A', graphemes:['A'] },
        { name:'tense', startUtf16Offset:1, endUtf16Offset:2, text:'V', graphemes:['V'] }
      ] });
    });

    it('preserves unmarked runs before, between, and after spans', () => {
      _expectPreparedText('A [tense]B[/] C [tense]D[/] E', { plainText:'A B C D E', spans:[
        { name:'tense', startUtf16Offset:2, endUtf16Offset:3, text:'B', graphemes:['B'] },
        { name:'tense', startUtf16Offset:6, endUtf16Offset:7, text:'D', graphemes:['D'] }
      ] });
    });

    it('retains whitespace in span-local grapheme positions', () => {
      _expectPreparedText('[tense] a b [/]', { plainText:' a b ', spans:[{
        name:'tense', startUtf16Offset:0, endUtf16Offset:5, text:' a b ', graphemes:[' ', 'a', ' ', 'b', ' ']
      }] });
    });

    it('keeps UTF-16 offsets distinct from grapheme indices', () => {
      _expectPreparedText('\u{1F600}[tense]e\u0301 \u{1F469}\u200D\u{1F4BB}[/]!', {
        plainText:'\u{1F600}e\u0301 \u{1F469}\u200D\u{1F4BB}!', spans:[{
          name:'tense', startUtf16Offset:2, endUtf16Offset:10,
          text:'e\u0301 \u{1F469}\u200D\u{1F4BB}', graphemes:['e\u0301', ' ', '\u{1F469}\u200D\u{1F4BB}']
        }]
      });
    });

    it('rejects bracketed punctuation as an unknown animation', () => {
      _expectInvalidText('Wait [!]', 'Unknown text animation "!".');
    });

    it('rejects unknown names inside a span', () => {
      _expectInvalidText('[tense]a[!]b[/]', 'Unknown text animation "!".');
    });

    it('accepts an empty span', () => {
      _expectPreparedText('a[tense][/]b', { plainText:'ab', spans:[{
        name:'tense', startUtf16Offset:1, endUtf16Offset:1, text:'', graphemes:[]
      }] });
    });

    it('rejects unknown animation names', () => {
      _expectInvalidText('a[pulse]b[/]', 'Unknown text animation "pulse".');
    });

    it('rejects an unregistered name regardless of its characters', () => {
      _expectInvalidText('[shake_2-fast]', 'Unknown text animation "shake_2-fast".');
    });

    it('treats names as case-sensitive', () => {
      _expectInvalidText('[Tense]b[/]', 'Unknown text animation "Tense".');
    });

    it('rejects nested spans', () => {
      _expectInvalidText('[tense]a[tense]b[/][/]', 'Nested text animation spans are invalid.');
    });

    it('rejects unmatched closing tags', () => {
      _expectInvalidText('abc[/]', 'Unmatched text animation closing tag.');
    });

    it('rejects an extra closing tag after a completed span', () => {
      _expectInvalidText('[tense]a[/][/]', 'Unmatched text animation closing tag.');
    });

    it('reports unclosed opening tags after a UTF-16 prefix at the activity source line', () => {
      _expectInvalidText('\u{1F600}[tense]doom', 'Unclosed text animation "tense".');
    });

    it('does not treat an extra opening bracket as literal text', () => {
      _expectInvalidText('[[tense]a[/]', 'Unknown text animation "[tense".');
    });

    it('rejects a missing closing bracket', () => {
      _expectInvalidText('a [tense', 'Missing text animation closing bracket.');
    });

    it('rejects a stray closing bracket', () => {
      _expectInvalidText('a ] [tense]b[/]', 'Unmatched text animation closing bracket.');
    });

    it('rejects a trailing closing bracket', () => {
      _expectInvalidText('[tense]a[/]]', 'Unmatched text animation closing bracket.');
    });

    it('rejects an empty opening tag', () => {
      _expectInvalidText('[]', 'Unknown text animation "".');
    });

    it('does not trim animation names', () => {
      _expectInvalidText('[ tense]', 'Unknown text animation " tense".');
    });

    it('requires the exact closing tag contents', () => {
      _expectInvalidText('[tense] a b [/ ]', 'Unknown text animation "/ ".');
    });
  });
});
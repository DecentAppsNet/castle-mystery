import { describe, expect, it } from 'vitest';

import { parseTextAnimations } from '../parseTextAnimations';

describe('parseTextAnimations', () => {
  describe('parseTextAnimations()', () => {
    it('preserves plain text without preparing unmarked graphemes', () => {
      expect(parseTextAnimations('It will be your doom.')).toEqual({
        success:true, preparedText:{ plainText:'It will be your doom.', spans:[] }
      });
    });

    it('accepts empty text', () => {
      expect(parseTextAnimations('')).toEqual({ success:true, preparedText:{ plainText:'', spans:[] } });
    });

    it('prepares a single span with visible-text offsets', () => {
      expect(parseTextAnimations('Your [tense]doom[/].')).toEqual({
        success:true, preparedText:{ plainText:'Your doom.', spans:[{
          name:'tense', startUtf16Offset:5, endUtf16Offset:9, text:'doom', graphemes:['d', 'o', 'o', 'm']
        }] }
      });
    });

    it('prepares adjacent spans separately', () => {
      expect(parseTextAnimations('[tense]A[/][tense]V[/]')).toEqual({
        success:true, preparedText:{ plainText:'AV', spans:[
          { name:'tense', startUtf16Offset:0, endUtf16Offset:1, text:'A', graphemes:['A'] },
          { name:'tense', startUtf16Offset:1, endUtf16Offset:2, text:'V', graphemes:['V'] }
        ] }
      });
    });

    it('preserves unmarked runs before, between, and after spans', () => {
      expect(parseTextAnimations('A [tense]B[/] C [tense]D[/] E')).toEqual({
        success:true, preparedText:{ plainText:'A B C D E', spans:[
          { name:'tense', startUtf16Offset:2, endUtf16Offset:3, text:'B', graphemes:['B'] },
          { name:'tense', startUtf16Offset:6, endUtf16Offset:7, text:'D', graphemes:['D'] }
        ] }
      });
    });

    it('retains whitespace in span-local grapheme positions', () => {
      expect(parseTextAnimations('[tense] a b [/]')).toEqual({
        success:true, preparedText:{ plainText:' a b ', spans:[{
          name:'tense', startUtf16Offset:0, endUtf16Offset:5, text:' a b ', graphemes:[' ', 'a', ' ', 'b', ' ']
        }] }
      });
    });

    it('keeps UTF-16 offsets distinct from grapheme indices', () => {
      expect(parseTextAnimations('\u{1F600}[tense]e\u0301 \u{1F469}\u200D\u{1F4BB}[/]!')).toEqual({
        success:true, preparedText:{ plainText:'\u{1F600}e\u0301 \u{1F469}\u200D\u{1F4BB}!', spans:[{
          name:'tense', startUtf16Offset:2, endUtf16Offset:10,
          text:'e\u0301 \u{1F469}\u200D\u{1F4BB}', graphemes:['e\u0301', ' ', '\u{1F469}\u200D\u{1F4BB}']
        }] }
      });
    });

    it('rejects bracketed punctuation as an unknown animation', () => {
      expect(parseTextAnimations('Wait [!]')).toEqual({
        success:false, message:'Unknown text animation "!".', utf16Offset:5
      });
    });

    it('rejects unknown names inside a span', () => {
      expect(parseTextAnimations('[tense]a[!]b[/]')).toEqual({
        success:false, message:'Unknown text animation "!".', utf16Offset:8
      });
    });

    it('accepts an empty span', () => {
      expect(parseTextAnimations('a[tense][/]b')).toEqual({
        success:true, preparedText:{ plainText:'ab', spans:[{
          name:'tense', startUtf16Offset:1, endUtf16Offset:1, text:'', graphemes:[]
        }] }
      });
    });

    it('rejects unknown animation names', () => {
      expect(parseTextAnimations('a[pulse]b[/]')).toEqual({
        success:false, message:'Unknown text animation "pulse".', utf16Offset:1
      });
    });

    it('rejects an unregistered name regardless of its characters', () => {
      expect(parseTextAnimations('[shake_2-fast]')).toEqual({
        success:false, message:'Unknown text animation "shake_2-fast".', utf16Offset:0
      });
    });

    it('treats names as case-sensitive', () => {
      expect(parseTextAnimations('[Tense]b[/]')).toEqual({
        success:false, message:'Unknown text animation "Tense".', utf16Offset:0
      });
    });

    it('rejects nested spans', () => {
      expect(parseTextAnimations('[tense]a[tense]b[/][/]')).toEqual({
        success:false, message:'Nested text animation spans are invalid.', utf16Offset:8
      });
    });

    it('rejects unmatched closing tags', () => {
      expect(parseTextAnimations('abc[/]')).toEqual({
        success:false, message:'Unmatched text animation closing tag.', utf16Offset:3
      });
    });

    it('rejects an extra closing tag after a completed span', () => {
      expect(parseTextAnimations('[tense]a[/][/]')).toEqual({
        success:false, message:'Unmatched text animation closing tag.', utf16Offset:11
      });
    });

    it('rejects unclosed opening tags at their authored UTF-16 offset', () => {
      expect(parseTextAnimations('\u{1F600}[tense]doom')).toEqual({
        success:false, message:'Unclosed text animation "tense".', utf16Offset:2
      });
    });

    it('does not treat an extra opening bracket as literal text', () => {
      expect(parseTextAnimations('[[tense]a[/]')).toEqual({
        success:false, message:'Unknown text animation "[tense".', utf16Offset:0
      });
    });

    it('rejects a missing closing bracket', () => {
      expect(parseTextAnimations('a [tense')).toEqual({
        success:false, message:'Missing text animation closing bracket.', utf16Offset:2
      });
    });

    it('rejects a stray closing bracket', () => {
      expect(parseTextAnimations('a ] [tense]b[/]')).toEqual({
        success:false, message:'Unmatched text animation closing bracket.', utf16Offset:2
      });
    });

    it('rejects a trailing closing bracket', () => {
      expect(parseTextAnimations('[tense]a[/]]')).toEqual({
        success:false, message:'Unmatched text animation closing bracket.', utf16Offset:11
      });
    });

    it('rejects an empty opening tag', () => {
      expect(parseTextAnimations('[]')).toEqual({
        success:false, message:'Unknown text animation "".', utf16Offset:0
      });
    });

    it('does not trim animation names', () => {
      expect(parseTextAnimations('[ tense]')).toEqual({
        success:false, message:'Unknown text animation " tense".', utf16Offset:0
      });
    });

    it('requires the exact closing tag contents', () => {
      expect(parseTextAnimations('[tense] a b [/ ]')).toEqual({
        success:false, message:'Unknown text animation "/ ".', utf16Offset:12
      });
    });
  });
});
// Follow test conventions from CONTRIBUTING.md when editing this file.

import { describe, expect, it } from 'vitest';

import speechSourceValidationText from './fixtures/speech-source-validation.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('speech source validation', () => {
  it('accepts a valid says character source', () => {
    const text = replaceSection(speechSourceValidationText, 'itinerary', ['0:00:00 Sam says "secret"']);
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('accepts a valid thinks character source', () => {
    const text = replaceSection(speechSourceValidationText, 'itinerary', ['0:00:00 Sam thinks "secret"']);
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('accepts a valid emits character source', () => {
    const text = replaceSection(speechSourceValidationText, 'itinerary', ['0:00:00 Sam emits "secret"']);
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('rejects a says source hidden by a later-authored same-time activity', () => {
    const { level, errors } = loadLevelForTest(speechSourceValidationText, 'speech-source-validation.md');
    const speechLineNo = speechSourceValidationText.split('\n')
      .findIndex(line => line === '0:00:00 Sam says "secret"') + 1;

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(`speech-source-validation.md:${speechLineNo}:0:`);
    expect(errors.describeErrors()).toContain('"sam" can\'t say "secret" at 0:00:00 because they are not visible.');
  });

  it('rejects a thinks source hidden by a later-authored same-time activity', () => {
    const text = speechSourceValidationText.replace(
      '0:00:00 Sam says "secret"', '0:00:00 Sam thinks "secret"');
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" can\'t think "secret" at 0:00:00 because they are not visible.');
  });

  it('rejects an emits source hidden by a later-authored same-time activity', () => {
    const text = speechSourceValidationText.replace(
      '0:00:00 Sam says "secret"', '0:00:00 Sam emits "secret"');
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" can\'t emit "secret" at 0:00:00 because they are not visible.');
  });

  it('rejects a visible unplaced says character source', () => {
    const text = replaceSection(speechSourceValidationText, 'itinerary', ['0:00:00 Ghost says "secret"']);
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"ghost" can\'t say "secret" at 0:00:00 because they are not placed in a room.');
  });

  it('rejects a visible unplaced thinks character source', () => {
    const text = replaceSection(speechSourceValidationText, 'itinerary', ['0:00:00 Ghost thinks "secret"']);
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"ghost" can\'t think "secret" at 0:00:00 because they are not placed in a room.');
  });

  it('rejects a visible unplaced emits character source', () => {
    const text = replaceSection(speechSourceValidationText, 'itinerary', ['0:00:00 Ghost emits "secret"']);
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"ghost" can\'t emit "secret" at 0:00:00 because they are not placed in a room.');
  });

  it('uses same-time final item placement when becomes is authored after speech', () => {
    const text = speechSourceValidationText
      .replace('0:00:00 Sam says "secret"', '0:00:00 Floor Bell emits "chime"')
      .replace('0:00:00 hide Sam', '0:00:00 Floor Bell becomes Unplaced Bell');
    const { level, errors } = loadLevelForTest(text, 'speech-source-validation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"floor bell" item can\'t emit "chime" at 0:00:00 because it is not placed in a room or held by a character.');
  });
});
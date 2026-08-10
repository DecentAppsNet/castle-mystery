import { describe, it, expect } from 'vitest';
import duplicateHeadingText from './fixtures/conclusions-duplicate-heading.md?raw';
import duplicateVariableText from './fixtures/conclusions-duplicate-variable.md?raw';
import missingConclusionLineText from './fixtures/conclusions-missing-conclusion-line.md?raw';
import normalizationDuplicateText from './fixtures/conclusions-normalization-duplicate.md?raw';
import revealRoomNotObscuredText from './fixtures/conclusions-reveal-room-not-obscured.md?raw';
import revealRoomUnknownText from './fixtures/conclusions-reveal-room-unknown.md?raw';
import successAuthoredGeneratedText from './fixtures/conclusions-success-authored-generated.md?raw';
import successAuthoredLockingText from './fixtures/conclusions-success-authored-locking.md?raw';
import successIdentitiesMetadataOnlyText from './fixtures/conclusions-success-identities-metadata-only.md?raw';
import unlockSelfText from './fixtures/conclusions-unlock-self.md?raw';
import unlockUnknownText from './fixtures/conclusions-unlock-unknown.md?raw';
import unknownCharacterOptionText from './fixtures/conclusions-unknown-character-option.md?raw';
import { loadLevelForTest } from './testLevelUtil';

function _expectFailure(text:string, filename:string, expectedMessage:string) {
  const { level, errors } = loadLevelForTest(text, filename);

  expect(level).toBeNull();
  expect(errors.describeErrors()).toContain(expectedMessage);
}

describe('loading levels - conclusions', () => {
  it('loads an authored conclusion and a generated identities conclusion into level.conclusions', () => {
    const { level, errors } = loadLevelForTest(successAuthoredGeneratedText, 'conclusions-success-authored-generated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.conclusions.map(conclusion => conclusion.id)).toEqual(['identities', 'missing book']);

    const identities = level?.conclusions[0];
    const missingBook = level?.conclusions[1];

    expect(identities).toMatchObject({
      id:'identities',
      title:'Identities',
      isComplete:false,
      isLocked:false,
      unlockConclusionIds:[],
      revealRoomIds:[]
    });
    expect(identities?.parts.map(part => part.type)).toEqual(['image', 'text', 'blank']);
    expect(identities?.parts[0]).toMatchObject({ imageUrl:'/assets/faces/sam.png' });
    expect(identities?.parts[2]).toMatchObject({
      availableAnswers:['Detective Sam'],
      correctAnswerIndexes:[0],
      playerAnswerIndex:-1
    });

    expect(missingBook).toMatchObject({
      id:'missing book',
      title:'Missing Book',
      isComplete:false,
      isLocked:false,
      unlockConclusionIds:[],
      revealRoomIds:['study']
    });
    expect(missingBook?.parts.map(part => part.type)).toEqual(['image', 'blank', 'separator', 'blank']);
    expect(missingBook?.parts[0]).toMatchObject({ imageUrl:['/assets/conclusions/book.png', '/assets/faces/book.png'] });
    expect(missingBook?.parts[1]).toMatchObject({
      availableAnswers:['Hall', 'Study'],
      correctAnswerIndexes:[1],
      playerAnswerIndex:-1
    });
    expect(missingBook?.parts[3]).toMatchObject({
      availableAnswers:['Detective Sam'],
      correctAnswerIndexes:[0],
      playerAnswerIndex:-1
    });
  });

  it('loads multiple authored conclusions and locks conclusions targeted by unlockConclusions', () => {
    const { level, errors } = loadLevelForTest(successAuthoredLockingText, 'conclusions-success-authored-locking.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.conclusions.map(conclusion => conclusion.id)).toEqual(['identities', 'first clue', 'second clue']);
    expect(level?.conclusions.find(conclusion => conclusion.id === 'first clue')).toMatchObject({
      unlockConclusionIds:['second clue'],
      isLocked:false
    });
    expect(level?.conclusions.find(conclusion => conclusion.id === 'second clue')).toMatchObject({
      unlockConclusionIds:[],
      isLocked:true
    });
  });

  it('treats an identities subsection with only metadata as overrides for the generated identities conclusion', () => {
    const { level, errors } = loadLevelForTest(successIdentitiesMetadataOnlyText, 'conclusions-success-identities-metadata-only.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();

    const identities = level?.conclusions.find(conclusion => conclusion.id === 'identities') ?? null;
    const finalMystery = level?.conclusions.find(conclusion => conclusion.id === 'final mystery') ?? null;
    const identityBlanks = identities?.parts.filter(part => part.type === 'blank') ?? [];

    expect(identities).not.toBeNull();
    expect(identityBlanks).toHaveLength(1);
    expect(identities?.title).toBe('Identities');
    expect(identities?.revealRoomIds).toEqual(['study']);
    expect(identities?.unlockConclusionIds).toEqual(['final mystery']);
    expect(identities?.isLocked).toBe(false);
    expect(finalMystery?.isLocked).toBe(true);
  });

  it('fails if the conclusions section contains duplicate subsections with the same heading text', () => {
    _expectFailure(duplicateHeadingText, 'conclusions-duplicate-heading.md', "duplicate section 'Mystery'");
  });

  it('fails if the conclusions section contains different headings that normalize to the same conclusion ID', () => {
    _expectFailure(normalizationDuplicateText, 'conclusions-normalization-duplicate.md', 'After normalization');
  });

  it('fails if a non-identities conclusion subsection omits the conclusion line', () => {
    _expectFailure(missingConclusionLineText, 'conclusions-missing-conclusion-line.md', 'Missing "conclusion=" line for "Mystery" conclusion.');
  });

  it('fails if revealRooms references a room that does not exist', () => {
    _expectFailure(revealRoomUnknownText, 'conclusions-reveal-room-unknown.md', '"Tower" doesn\'t match a defined room.');
  });

  it('fails if revealRooms references a room that is not obscured', () => {
    _expectFailure(revealRoomNotObscuredText, 'conclusions-reveal-room-not-obscured.md', '"Hall" is not obscured, so conclusion can\'t reveal it.');
  });

  it('fails if unlockConclusions makes a conclusion unlock itself', () => {
    _expectFailure(unlockSelfText, 'conclusions-unlock-self.md', 'Conclusion can\'t unlock itself.');
  });

  it('fails if unlockConclusions references a conclusion that is not defined', () => {
    _expectFailure(unlockUnknownText, 'conclusions-unlock-unknown.md', '"Aftermath" doesn\'t match a defined conclusion.');
  });

  it('fails if an authored identities character option does not match a defined character', () => {
    _expectFailure(unknownCharacterOptionText, 'conclusions-unknown-character-option.md', 'Could not find character matching "Ghost".');
  });

  it('fails if the conclusions section repeats a top-level variable', () => {
    _expectFailure(duplicateVariableText, 'conclusions-duplicate-variable.md', 'variable appears more than once in section.');
  });
});
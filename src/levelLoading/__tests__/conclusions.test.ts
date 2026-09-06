import { describe, it, expect } from 'vitest';
import defaultLevelText from './fixtures/conclusions-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _expectFailure(text:string, filename:string, expectedMessage:string) {
  const { level, errors } = loadLevelForTest(text, filename);

  expect(level).toBeNull();
  expect(errors.describeErrors()).toContain(expectedMessage);
}

describe('loading levels - conclusions', () => {
  it('loads an authored conclusion and a generated identities conclusion into level.conclusions', () => {
    let text = replaceSection(defaultLevelText, 'characters', [
      '## Sam',
      '* title=Detective Sam',
      '* description=Lead investigator.',
      '* faceImage=sam.png'
    ]);
    text = replaceSection(text, 'conclusions', [
      '## Missing Book',
      '* conclusion=(book.png)[Study]---[Detective Sam]',
      '* revealRooms=Study'
    ]);
    const { level, errors } = loadLevelForTest(text, 'conclusions-success-authored-generated.md');

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
    const text = replaceSection(defaultLevelText, 'conclusions', [
      '## First Clue',
      '* conclusion=[Hall]',
      '* unlockConclusions=Second Clue',
      '',
      '## Second Clue',
      '* conclusion=[Study]'
    ]);
    const { level, errors } = loadLevelForTest(text, 'conclusions-success-authored-locking.md');

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
    const text = replaceSection(defaultLevelText, 'conclusions', [
      '## Final Mystery',
      '* conclusion=[Hall]',
      '',
      '## Identities',
      '* revealRooms=Study',
      '* unlockConclusions=Final Mystery'
    ]);
    const { level, errors } = loadLevelForTest(text, 'conclusions-success-identities-metadata-only.md');

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
    const text = replaceSection(defaultLevelText, 'conclusions', ['## Mystery', '', '## Mystery']);
    _expectFailure(text, 'conclusions-duplicate-heading.md', "duplicate section 'Mystery'");
  });

  it('fails if the conclusions section contains different headings that normalize to the same conclusion ID', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', ['## Mystery Note', '', '## mystery note']);
    _expectFailure(text, 'conclusions-normalization-duplicate.md', 'After normalization');
  });

  it('fails if a non-identities conclusion subsection omits the conclusion line', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', ['## Mystery', '* revealRooms=Study']);
    _expectFailure(text, 'conclusions-missing-conclusion-line.md', 'Missing "conclusion=" line for "Mystery" conclusion.');
  });

  it('fails if revealRooms references a room that does not exist', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', [
      '## Mystery',
      '* conclusion=[Hall]',
      '* revealRooms=Tower'
    ]);
    _expectFailure(text, 'conclusions-reveal-room-unknown.md', '"Tower" doesn\'t match a defined room.');
  });

  it('fails if revealRooms references a room that is not obscured', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', [
      '## Mystery',
      '* conclusion=[Hall]',
      '* revealRooms=Hall'
    ]);
    _expectFailure(text, 'conclusions-reveal-room-not-obscured.md', '"Hall" is not obscured, so conclusion can\'t reveal it.');
  });

  it('fails if unlockConclusions makes a conclusion unlock itself', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', [
      '## Mystery',
      '* conclusion=[Hall]',
      '* unlockConclusions=Mystery'
    ]);
    _expectFailure(text, 'conclusions-unlock-self.md', 'Conclusion can\'t unlock itself.');
  });

  it('fails if unlockConclusions references a conclusion that is not defined', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', [
      '## Mystery',
      '* conclusion=[Hall]',
      '* unlockConclusions=Aftermath'
    ]);
    _expectFailure(text, 'conclusions-unlock-unknown.md', '"Aftermath" doesn\'t match a defined conclusion.');
  });

  it('fails if an authored identities character option does not match a defined character', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', ['* characters=Ghost']);
    _expectFailure(text, 'conclusions-unknown-character-option.md', 'Could not find character matching "Ghost".');
  });

  it('fails if the conclusions section repeats a top-level variable', () => {
    const text = replaceSection(defaultLevelText, 'conclusions', [
      '* characters=Detective Sam',
      '* CHARACTERS=Ghost',
      '',
      '## Mystery',
      '* conclusion=[Hall]'
    ]);
    _expectFailure(text, 'conclusions-duplicate-variable.md', 'variable appears more than once in section.');
  });
});
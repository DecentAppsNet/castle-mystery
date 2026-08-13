import { describe, it, expect } from 'vitest';
import defaultLevelText from './fixtures/characters-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('loading levels - characters', () => {
  it('loads a minimal character into allCharactersById on the returned level', () => {
    const { level, errors } = loadLevelForTest(defaultLevelText, 'characters-success-minimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level!.characters.length).toBe(1);
    const sam = level?.characters.find(c => c.id === 'sam');
    expect(sam).toMatchObject({
      id:'sam',
      title:'Sam',
      faceImageUrl:null,
      isVisible:true,
      facingDirection:'right',
      bodyOrientation:'standing',
      isTitleKnown:false,
      description:'',
      items:[],
      leftHandItem:null,
      rightHandItem:null
    });
  });

  it('loads character metadata and merges held items into allCharactersById on the returned level', () => {
    let text = replaceSection(defaultLevelText, 'characters', [
      '## Sam',
      '* title=Detective Sam',
      '* description=The lead investigator.',
      '* faceImage=sam.png',
      '* visible=false',
      '* facingDirection=left',
      '* bodyOrientation=sitting',
      '* isTitleKnown=false',
      '* items=Notebook',
      '* leftHand=Lantern',
      '* rightHand=Brass Key',
      '',
      '### Default'
    ]);
    text = replaceSection(text, 'items', [
      '## Notebook',
      '* title=Case Notebook',
      '* description=Filled with notes.',
      '* image=notebook.png',
      '',
      '## Lantern',
      '* title=Oil Lantern',
      '',
      '## Brass Key',
      '* title=Vault Key'
    ]);
    const { level, errors } = loadLevelForTest(text, 'characters-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
     expect(level!.characters.length).toBe(1);
    const sam = level?.characters.find(c => c.id === 'sam');
    expect(sam).toMatchObject({
      id:'sam',
      title:'Detective Sam',
      faceImageUrl:'/assets/faces/sam.png',
      isVisible:false,
      facingDirection:'left',
      bodyOrientation:'sitting',
      isTitleKnown:false,
      description:'The lead investigator.',
      items:[{
        id:'notebook',
        title:'Case Notebook',
        description:'Filled with notes.',
        imageUrl:'/assets/items/notebook.png'
      }],
      leftHandItem:{
        id:'lantern',
        title:'Oil Lantern'
      },
      rightHandItem:{
        id:'brass key',
        title:'Vault Key'
      }
    });
  });

  it('fails if the characters section contains duplicate subsections with the same heading text', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '', '## Sam']);
    const { level, errors } = loadLevelForTest(text, 'characters-duplicate-heading.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Sam'");
  });

  it('fails if the characters section contains different headings that normalize to the same character ID', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '', '## sam']);
    const { level, errors } = loadLevelForTest(text, 'characters-normalization-duplicate.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('After normalization');
  });

  it('loads level despite a character not having a position defined in a room grid', () => {
    const text = replaceSection(defaultLevelText, 'rooms', [
      '## Hall',
      '',
      '```',
      '....',
      '....',
      '....',
      '```'
    ]);
    const { level, errors } = loadLevelForTest(text, 'characters-missing-position.md');

    expect(level).not.toBeNull();
    expect(errors.count).toEqual(0);
    expect(level!.characters.find(c => c.id === 'sam')).not.toBeNull();
  });

  it('fails if a character visible value is not boolean-like', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* visible=maybe', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-visible.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if a character facingDirection is not an allowed value', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* facingDirection=up', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-facing-direction.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"up" was not an expected value');
  });

  it('fails if a character bodyOrientation is not an allowed value', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* bodyOrientation=floating', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-body-orientation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"floating" was not an expected valoue');
  });

  it('fails if a character isTitleKnown value is not boolean-like', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* isTitleKnown=maybe', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-is-title-known.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if a character inventory item is not defined in the items section', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* items=Notebook', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'characters-item-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "notebook".');
  });

  it('fails if a character leftHand item is not defined in the items section', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* leftHand=Lantern', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'characters-left-hand-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "lantern".');
  });

  it('fails if a character rightHand item is not defined in the items section', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* rightHand=Brass Key', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'characters-right-hand-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "brass key".');
  });
});

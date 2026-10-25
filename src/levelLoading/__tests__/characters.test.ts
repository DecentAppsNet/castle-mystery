import { describe, it, expect } from 'vitest';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultCharacterBody, getHeadImageUrl, replaceHeadImage } from '@/game/characterBody';
import defaultLevelText from './fixtures/characters-base.md?raw';
import appearsBaseText from './fixtures/appears/appears-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('loading levels - characters', () => {
  it('inherits the default body definition without adding it to timeline state', () => {
    const { level, errors } = loadLevelForTest(defaultLevelText);
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level!.characters[0].rootBodyPart).toEqual(createDefaultCharacter().rootBodyPart);
    expect(level!.timeline.keyframes[0].characters[0]).not.toHaveProperty('rootBodyPart');
  });

  it('loads the authored head image into the default body without changing its geometry', () => {
    const { level, errors } = loadLevelForTest(appearsBaseText);
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = level!.characters[0];
    expect(getHeadImageUrl(sam.rootBodyPart)).toBe('/assets/bodies/base.png');
    expect(sam.rootBodyPart).toEqual(replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/base.png'));
  });

  it('keeps the default initial skin when appearsAs is omitted', () => {
    const { level, errors } = loadLevelForTest(appearsBaseText);
    expect(errors.describeErrors()).toBe('');
    expect(level?.characters[0].skinId).toBe('sam-default');
    expect(level?.timeline.keyframes[0].characters[0].skinId).toBe('sam-default');
  });

  it('copies a named initial skin into the first timeline keyframe without changing base metadata', () => {
    const text = appearsBaseText.replace('## Sam', '## Sam\n* appearsAs=Detective');
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.characters[0]).toMatchObject({ skinId:'sam-detective', description:'Base description.' });
    expect(getHeadImageUrl(level!.characters[0].rootBodyPart)).toBe('/assets/bodies/base.png');
    expect(level?.timeline.keyframes[0].characters[0].skinId).toBe('sam-detective');
  });

  it('normalizes case and surrounding whitespace in an initial skin reference', () => {
    const text = appearsBaseText.replace('## Sam', '## Sam\n* appearsAs=  dEtEcTiVe  ');
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.characters[0].skinId).toBe('sam-detective');
  });

  it('accepts an explicit normalized default initial appearance', () => {
    const text = appearsBaseText.replace('## Sam', '## Sam\n* appearsAs= DEFAULT ');
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.characters[0].skinId).toBe('sam-default');
  });

  it('reports an unknown initial skin at its authored property line', () => {
    const text = appearsBaseText.replace('* headImage=base.png', '* appearsAs=Missing');
    const { level, errors } = loadLevelForTest(text, 'initial-unknown.md');
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('initial-unknown.md:36:');
    expect(errors.describeErrors()).toContain('Unknown initial appearance "Missing"');
  });

  it('rejects an explicitly empty initial skin reference', () => {
    const text = appearsBaseText.replace('* headImage=base.png', '* appearsAs=');
    const { level, errors } = loadLevelForTest(text, 'initial-empty.md');
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('initial-empty.md:36:');
    expect(errors.describeErrors()).toContain('Unknown initial appearance ""');
  });

  it('rejects a complete skin ID as an initial skin heading reference', () => {
    const text = appearsBaseText.replace('## Sam', '## Sam\n* appearsAs=sam-detective');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Unknown initial appearance "sam-detective"');
  });

  it('rejects a skin belonging only to another character', () => {
    const text = appearsBaseText.replace('## Sam', '## Sam\n* appearsAs=Butler');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Unknown initial appearance "Butler"');
  });

  it('loads a minimal character into allCharactersById on the returned level', () => {
    const { level, errors } = loadLevelForTest(defaultLevelText, 'characters-success-minimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level!.characters.length).toBe(1);
    const sam = level?.characters.find(c => c.id === 'sam');
    expect(sam).toMatchObject({
      id:'sam',
      title:'Sam',
      rootBodyPart:createDefaultCharacterBody(),
      isVisible:true,
      facingDirection:'right',
      bodyOrientation:'standing',
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
      '* headImage=sam.png',
      '* visible=false',
      '* facing=left',
      '* orientation=sitting',
      '* isTitleKnown=true',
      '* items=Notebook',
      '* leftHand=Lantern',
      '* rightHand=Brass Key'
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
      rootBodyPart:replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/sam.png'),
      isVisible:false,
      facingDirection:'left',
      bodyOrientation:'sitting',
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
    expect(level?.discoveryConfig.initiallyKnownTitleCharacterIds).toEqual(new Set(['sam']));
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
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* visible=maybe']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-visible.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if a character facing is not an allowed value', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* facing=up']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-facing-direction.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"up" was not an expected value');
  });

  it('fails if a character bodyOrientation is not an allowed value', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* orientation=floating']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-body-orientation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"floating" was not an expected valoue');
  });

  it('fails if a character isTitleKnown value is not boolean-like', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* isTitleKnown=maybe']);
    const { level, errors } = loadLevelForTest(text, 'characters-invalid-is-title-known.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if a character inventory item is not defined in the items section', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* items=Notebook']);
    const { level, errors } = loadLevelForTest(text, 'characters-item-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "notebook".');
  });

  it('fails if a character leftHand item is not defined in the items section', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* leftHand=Lantern']);
    const { level, errors } = loadLevelForTest(text, 'characters-left-hand-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "lantern".');
  });

  it('fails if a character rightHand item is not defined in the items section', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '* rightHand=Brass Key']);
    const { level, errors } = loadLevelForTest(text, 'characters-right-hand-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "brass key".');
  });
});

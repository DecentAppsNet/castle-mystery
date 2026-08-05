import { describe, it, expect } from 'vitest';
import duplicateHeadingText from './fixtures/characters-duplicate-heading.md?raw';
import invalidBodyOrientationText from './fixtures/characters-invalid-body-orientation.md?raw';
import invalidFacingDirectionText from './fixtures/characters-invalid-facing-direction.md?raw';
import invalidIsTitleKnownText from './fixtures/characters-invalid-is-title-known.md?raw';
import invalidVisibleText from './fixtures/characters-invalid-visible.md?raw';
import itemMissingDefinitionText from './fixtures/characters-item-missing-definition.md?raw';
import leftHandMissingDefinitionText from './fixtures/characters-left-hand-missing-definition.md?raw';
import missingPositionText from './fixtures/characters-missing-position.md?raw';
import normalizationDuplicateText from './fixtures/characters-normalization-duplicate.md?raw';
import rightHandMissingDefinitionText from './fixtures/characters-right-hand-missing-definition.md?raw';
import successMinimalText from './fixtures/characters-success-minimal.md?raw';
import successPopulatedText from './fixtures/characters-success-populated.md?raw';
import { loadLevelForTest } from './testLevelUtil';

describe('loading levels - characters', () => {
  it('loads a minimal character into allCharactersById on the returned level', () => {
    const { level, errors } = loadLevelForTest(successMinimalText, 'characters-success-minimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.allCharactersById.size).toBe(1);
    expect(level?.allCharactersById.get('sam')).toMatchObject({
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
    const { level, errors } = loadLevelForTest(successPopulatedText, 'characters-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.allCharactersById.size).toBe(1);
    expect(level?.allCharactersById.get('sam')).toMatchObject({
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
    const { level, errors } = loadLevelForTest(duplicateHeadingText, 'characters-duplicate-heading.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Sam'");
  });

  it('fails if the characters section contains different headings that normalize to the same character ID', () => {
    const { level, errors } = loadLevelForTest(normalizationDuplicateText, 'characters-normalization-duplicate.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('After normalization');
  });

  it('loads level despite a character not having a position defined in a room grid', () => {
    const { level, errors } = loadLevelForTest(missingPositionText, 'characters-missing-position.md');

    expect(level).not.toBeNull();
    expect(errors.count).toEqual(0);
    expect(level?.allCharactersById.get('sam')).not.toBeNull();
  });

  it('fails if a character visible value is not boolean-like', () => {
    const { level, errors } = loadLevelForTest(invalidVisibleText, 'characters-invalid-visible.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if a character facingDirection is not an allowed value', () => {
    const { level, errors } = loadLevelForTest(invalidFacingDirectionText, 'characters-invalid-facing-direction.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"up" was not an expected value');
  });

  it('fails if a character bodyOrientation is not an allowed value', () => {
    const { level, errors } = loadLevelForTest(invalidBodyOrientationText, 'characters-invalid-body-orientation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"floating" was not an expected valoue');
  });

  it('fails if a character isTitleKnown value is not boolean-like', () => {
    const { level, errors } = loadLevelForTest(invalidIsTitleKnownText, 'characters-invalid-is-title-known.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if a character inventory item is not defined in the items section', () => {
    const { level, errors } = loadLevelForTest(itemMissingDefinitionText, 'characters-item-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "notebook".');
  });

  it('fails if a character leftHand item is not defined in the items section', () => {
    const { level, errors } = loadLevelForTest(leftHandMissingDefinitionText, 'characters-left-hand-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "lantern".');
  });

  it('fails if a character rightHand item is not defined in the items section', () => {
    const { level, errors } = loadLevelForTest(rightHandMissingDefinitionText, 'characters-right-hand-missing-definition.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Could not find item in Items section matching "brass key".');
  });
});

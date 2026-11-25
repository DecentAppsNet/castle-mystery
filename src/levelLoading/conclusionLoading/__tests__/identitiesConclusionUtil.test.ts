import { afterEach, describe, expect, it } from 'vitest';
import literalCharactersText from '@/levelLoading/__tests__/fixtures/conclusions-literal-characters.md?raw';
import effectiveCharactersText from '@/levelLoading/__tests__/fixtures/conclusions-effective-characters.md?raw';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import { clearSeed, setSeed } from '@/common/randUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';

describe('identitiesConclusionUtil', () => {
  afterEach(clearSeed);

  describe('literal authored character options', () => {
    it('replaces generated identity options with literal text in authored spelling and order', () => {
      const level = loadValidLevelForTest(literalCharactersText);
      const identities = level.conclusions.find(conclusion => conclusion.id === 'identities');

      expect(identities?.parts[2]).toMatchObject({
        answerSet:{ answers:['Nobody', 'Detective Sam', 'sam', 'gHoSt'] },
        correctAnswerIndexes:[1],
        playerAnswerIndex:-1
      });
    });

    it('uses the same literal replacement in authored conclusion blanks', () => {
      const level = loadValidLevelForTest(literalCharactersText);
      const mystery = level.conclusions.find(conclusion => conclusion.id === 'mystery');

      expect(mystery?.parts[0]).toMatchObject({
        answerSet:{ answers:['Nobody', 'Detective Sam', 'sam', 'gHoSt'] },
        correctAnswerIndexes:[3],
        playerAnswerIndex:-1
      });
    });

    it('does not expand a literal ID-like option to its character title', () => {
      const level = loadValidLevelForTest(literalCharactersText.replace('[gHoSt]', '[sam]'));
      const mystery = level.conclusions.find(conclusion => conclusion.id === 'mystery');

      expect(mystery?.parts[0]).toMatchObject({
        answerSet:{ answers:['Nobody', 'Detective Sam', 'sam', 'gHoSt'] },
        correctAnswerIndexes:[2]
      });
    });
  });

  describe('effective character category', () => {
    it('excludes known titles from generated identities but not other conclusions', () => {
      setSeed(1);
      const level = loadValidLevelForTest(effectiveCharactersText);
      const identities = level.conclusions.find(conclusion => conclusion.id === 'identities')!;
      const mystery = level.conclusions.find(conclusion => conclusion.id === 'mystery')!;
      const authoredBlank = mystery.parts[0] as ClozeBlank;
      const identityBlanks = identities.parts.filter(part => part.type === 'blank') as ClozeBlank[];

      expect(authoredBlank.answerSet.answers).toEqual(['Detective Sam', 'Doctor Pat', 'Witness Quinn']);
      expect(identityBlanks).toHaveLength(2);
      identityBlanks.forEach(blank => expect(blank.answerSet.answers).toEqual(['Detective Sam', 'Witness Quinn']));
    });

    it('keeps authored character options including known titles and non-entity extras in their original order', () => {
      setSeed(1);
      const text = effectiveCharactersText.replace('# conclusions',
        '# conclusions\n* characters=Nobody|Witness Quinn|Doctor Pat|Detective Sam');
      const level = loadValidLevelForTest(text);
      const blanks = level.conclusions.flatMap(conclusion => conclusion.parts.filter(part => part.type === 'blank')) as ClozeBlank[];

      expect(blanks).toHaveLength(3);
      blanks.forEach(blank => expect(blank.answerSet.answers).toEqual(['Nobody', 'Witness Quinn', 'Doctor Pat', 'Detective Sam']));
    });

    it('keeps only placed, interactive, initially unknown characters as identity rows', () => {
      setSeed(1);
      const level = loadValidLevelForTest(effectiveCharactersText);
      const identities = level.conclusions.find(conclusion => conclusion.id === 'identities')!;
      const blanks = identities.parts.filter(part => part.type === 'blank') as ClozeBlank[];

      expect(identities.parts.map(part => part.type)).toEqual(['image', 'text', 'blank', 'separator', 'image', 'text', 'blank']);
      expect(identities.parts.filter(part => part.type === 'image')).toEqual([
        { type:'image', imageUrl:'/assets/bodies/quinn.png' },
        { type:'image', imageUrl:'/assets/bodies/sam.png' }
      ]);
      expect(blanks.map(blank => blank.answerSet.answers[blank.correctAnswerIndexes[0]])).toEqual(['Witness Quinn', 'Detective Sam']);
    });

    it('repeats seeded row order without randomizing category options', () => {
      setSeed(42);
      const first = loadValidLevelForTest(effectiveCharactersText).conclusions[0];
      setSeed(42);
      const second = loadValidLevelForTest(effectiveCharactersText).conclusions[0];

      expect(second).toEqual(first);
      const blanks = first.parts.filter(part => part.type === 'blank') as ClozeBlank[];
      expect(blanks.map(blank => blank.answerSet.answers)).toEqual([
        ['Detective Sam', 'Witness Quinn'],
        ['Detective Sam', 'Witness Quinn']
      ]);
    });

    it('does not generate rows when every interactive placed title is initially known', () => {
      const text = effectiveCharactersText.replace('* title=Detective Sam', '* title=Detective Sam\n* isTitleKnown=true')
        .replace('* title=Witness Quinn', '* title=Witness Quinn\n* isTitleKnown=true');
      const level = loadValidLevelForTest(text);

      expect(level.conclusions.map(conclusion => conclusion.id)).toEqual(['mystery']);
    });

    it('preserves explicit authored identities instead of adding generated rows', () => {
      const text = effectiveCharactersText.replace('## Mystery', '## Identities').replace('[Doctor Pat]', '[Witness Quinn]');
      const level = loadValidLevelForTest(text);

      expect(level.conclusions).toHaveLength(1);
      expect(level.conclusions[0].id).toBe('identities');
      expect(level.conclusions[0].parts).toHaveLength(1);
      expect(level.conclusions[0].parts[0]).toMatchObject({
        type:'blank', answerSet:{ answers:['Detective Sam', 'Witness Quinn'] }, correctAnswerIndexes:[1]
      });
    });

    it('allows a known title as a correct answer in authored identities with a character override', () => {
      const text = effectiveCharactersText.replace('## Mystery', '## Identities')
        .replace('# conclusions', '# conclusions\n* characters=Doctor Pat|Witness Quinn');
      const level = loadValidLevelForTest(text);

      expect(level.conclusions[0].parts[0]).toMatchObject({
        type:'blank', answerSet:{ answers:['Doctor Pat', 'Witness Quinn'] }, correctAnswerIndexes:[0]
      });
    });
  });
});
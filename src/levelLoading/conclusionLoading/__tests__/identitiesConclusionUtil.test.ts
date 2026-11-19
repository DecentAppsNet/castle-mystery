import { describe, expect, it } from 'vitest';
import literalCharactersText from '@/levelLoading/__tests__/fixtures/conclusions-literal-characters.md?raw';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';

describe('identitiesConclusionUtil', () => {
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
});
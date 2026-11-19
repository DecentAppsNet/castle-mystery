import { describe, expect, it } from 'vitest';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import ClozeBlank from '../conclusions/types/ClozeBlank';
import ClozePartType from '../conclusions/types/ClozePartType';
import { countConclusionMistakes } from '../conclusions/conclusionUtil';
import { createGameState } from '../gameUtil';
import { createLevelSaveState, restoreGameStateFromSave } from '../levelSaveStateUtil';
import discoveryText from './fixtures/discovery-state.md?raw';
import saveText from './fixtures/save-state.md?raw';

describe('restoreGameStateFromSave()', () => {
  it('merges saved discoveries without removing authored known titles or initial rooms', () => {
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const save = { ...createLevelSaveState(state), discoveredRoomIds:['study'],
      discoveredItemIds:['brass key'], discoveredSkinIds:['pat-default'], titleKnownCharacterIds:['pat'] };
    restoreGameStateFromSave(state, save);
    expect(state.discoveryState.discoveredRoomIds).toEqual(new Set(['hall', 'study']));
    expect(state.discoveryState.titleKnownCharacterIds).toEqual(new Set(['sam', 'pat']));
    expect(state.discoveryState.discoveredItemIds).toEqual(new Set(['brass key']));
    expect(state.discoveryState.discoveredSkinIds).toEqual(new Set(['pat-default']));
    expect(state.discoveryState.obscuredRoomIds).toEqual(new Set(['study']));
  });

  it('restores unfinished selections in blank order without completing a conclusion', () => {
    const state = createGameState(loadValidLevelForTest(saveText));
    const save = { ...createLevelSaveState(state), incompleteConclusionAnswerIndexesById:{ mystery:[1, -1] } };
    restoreGameStateFromSave(state, save);
    expect(createLevelSaveState(state).incompleteConclusionAnswerIndexesById.mystery).toEqual([1, -1]);
    expect(state.conclusions.find(conclusion => conclusion.id === 'mystery')!.isComplete).toBe(false);
    expect(state.isLevelComplete).toBe(false);
  });

  it('reconstructs completed blanks using deterministic authored correct answers', () => {
    const state = createGameState(loadValidLevelForTest(saveText));
    const save = { ...createLevelSaveState(state), completedConclusionIds:['mystery'],
      incompleteConclusionAnswerIndexesById:{} };
    restoreGameStateFromSave(state, save);
    const conclusion = state.conclusions.find(conclusion => conclusion.id === 'mystery')!;
    const blanks = conclusion.parts.filter(part => part.type === ClozePartType.blank) as ClozeBlank[];
    expect(blanks).toHaveLength(2);
    expect(blanks.map(blank => blank.playerAnswerIndex)).toEqual(blanks.map(blank => blank.correctAnswerIndexes[0]));
    expect(countConclusionMistakes(conclusion)).toBe(0);
    expect(conclusion.isComplete).toBe(true);
  });

  it('round-trips completed interchangeable blanks into deterministic distinct answers', () => {
    const text = saveText.replace('[Sam|Key]', '[Key|Sam]');
    const level = loadValidLevelForTest(text);
    const state = createGameState(level);
    const conclusion = state.conclusions.find(candidate => candidate.id === 'mystery')!;
    const blanks = conclusion.parts.filter(part => part.type === 'blank') as ClozeBlank[];
    blanks[0].playerAnswerIndex = 1;
    blanks[1].playerAnswerIndex = 0;
    conclusion.isComplete = true;
    const save = createLevelSaveState(state);
    const originalSave = JSON.stringify(save);
    const restored = createGameState(level);

    restoreGameStateFromSave(restored, save);
    const completed = restored.conclusions.find(candidate => candidate.id === 'mystery')!;
    const completedBlanks = completed.parts.filter(part => part.type === 'blank') as ClozeBlank[];
    expect(completedBlanks.map(blank => blank.playerAnswerIndex)).toEqual([0, 1]);
    expect(countConclusionMistakes(completed)).toBe(0);
    expect(completed.isComplete).toBe(true);
    expect(createLevelSaveState(restored)).toEqual(save);
    restoreGameStateFromSave(restored, save);
    expect(createLevelSaveState(restored)).toEqual(save);
    expect(JSON.stringify(save)).toBe(originalSave);
    expect((level.conclusions.find(candidate => candidate.id === 'mystery')!.parts[1] as ClozeBlank).playerAnswerIndex).toBe(-1);
  });

  it('round-trips duplicate unfinished selections unchanged instead of repairing them', () => {
    const level = loadValidLevelForTest(saveText);
    const state = createGameState(level);
    const conclusion = state.conclusions.find(candidate => candidate.id === 'mystery')!;
    const blanks = conclusion.parts.filter(part => part.type === 'blank') as ClozeBlank[];
    blanks[0].playerAnswerIndex = 1;
    blanks[1].playerAnswerIndex = 1;
    const save = createLevelSaveState(state);
    const restored = createGameState(level);

    restoreGameStateFromSave(restored, save);
    expect(createLevelSaveState(restored)).toEqual(save);
    const unfinished = restored.conclusions.find(candidate => candidate.id === 'mystery')!;
    expect(unfinished.isComplete).toBe(false);
    expect(countConclusionMistakes(unfinished)).toBe(1);
  });

  it('unlocks dependent conclusions and reveals rooms through existing state helpers', () => {
    const state = createGameState(loadValidLevelForTest(discoveryText));
    state.conclusions = state.conclusions.map(conclusion => conclusion.id === 'discovery'
      ? { ...conclusion, unlockConclusionIds:['identities'] } : { ...conclusion, isLocked:true });
    const save = { ...createLevelSaveState(state), completedConclusionIds:['discovery'],
      incompleteConclusionAnswerIndexesById:{} };
    restoreGameStateFromSave(state, save);
    expect(state.conclusions.find(conclusion => conclusion.id === 'identities')!.isLocked).toBe(false);
    expect(state.discoveryState.obscuredRoomIds).not.toContain('study');
    expect(state.isLevelComplete).toBe(false);
    expect(state.metaTimeEffects).toEqual([]);
  });

  it('reveals identity titles and full completion discoveries after marking all saved completions', () => {
    const state = createGameState(loadValidLevelForTest(discoveryText));
    state.conclusions = state.conclusions.map(conclusion => conclusion.id === 'discovery'
      ? { ...conclusion, unlockConclusionIds:['identities'] } : { ...conclusion, isLocked:true });
    const save = { ...createLevelSaveState(state), completedConclusionIds:['identities', 'discovery'],
      incompleteConclusionAnswerIndexesById:{} };
    restoreGameStateFromSave(state, save);
    expect(state.conclusions.every(conclusion => conclusion.isComplete && !conclusion.isLocked)).toBe(true);
    expect(state.isLevelComplete).toBe(true);
    expect(state.discoveryState.titleKnownCharacterIds).toEqual(new Set(['sam', 'pat']));
    expect(state.discoveryState.discoveredRoomIds).toEqual(new Set(['hall', 'study']));
    expect(state.discoveryState.discoveredItemIds).toEqual(new Set(['brass key']));
    expect(state.discoveryState.discoveredSkinIds).toEqual(new Set(['sam-default', 'pat-default']));
    expect(state.discoveryState.obscuredRoomIds.size).toBe(0);
  });

  it('preserves existing default selections and completions absent from the save', () => {
    const state = createGameState(loadValidLevelForTest(saveText));
    const mystery = state.conclusions.find(conclusion => conclusion.id === 'mystery')!;
    const blank = mystery.parts.find(part => part.type === ClozePartType.blank) as ClozeBlank;
    blank.playerAnswerIndex = 1;
    state.conclusions.find(conclusion => conclusion.id === 'finding')!.isComplete = true;
    const save = { ...createLevelSaveState(state), completedConclusionIds:[],
      incompleteConclusionAnswerIndexesById:{} };
    restoreGameStateFromSave(state, save);
    expect(createLevelSaveState(state).incompleteConclusionAnswerIndexesById.mystery).toEqual([1, -1]);
    expect(state.conclusions.find(conclusion => conclusion.id === 'finding')!.isComplete).toBe(true);
  });

  it('is idempotent and leaves authored data, saved arrays, and transient state unchanged', () => {
    const level = loadValidLevelForTest(discoveryText);
    const state = createGameState(level);
    const save = { ...createLevelSaveState(state), completedConclusionIds:['discovery', 'identities'],
      incompleteConclusionAnswerIndexesById:{} };
    const originalSave = JSON.stringify(save);
    const originalConclusions = JSON.stringify(level.conclusions);
    restoreGameStateFromSave(state, save);
    const restoredSave = createLevelSaveState(state);
    const revision = state.conclusionsRevision;
    const linkages = state.discoveryState.revealedSkinLinkages;
    restoreGameStateFromSave(state, save);
    expect(createLevelSaveState(state)).toEqual(restoredSave);
    expect(state.conclusionsRevision).toBe(revision);
    expect(state.discoveryState.revealedSkinLinkages).toEqual(linkages);
    expect(JSON.stringify(save)).toBe(originalSave);
    expect(JSON.stringify(level.conclusions)).toBe(originalConclusions);
    expect(level.discoveryConfig.initiallyObscuredRoomIds).toEqual(new Set(['study']));
    expect(state.metaTimeEffects).toEqual([]);
    expect(state.characterMetaTimeEffectsByCharacterId.size).toBe(0);
    expect(state.isPlaying).toBe(false);
  });
});
/* This file parses authored cloze conclusions and resolves their dependencies and reveal effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from "@/game/conclusions/types/Conclusion";
import { normalizeId } from "@/game/idUtil";
import Room from "@/game/types/Room";
import ClozeCategory from "./types/ClozeCategory";
import { createNormalizedSectionEntryMap, createSectionVariables } from "../levelFileSectionUtil";
import { ErrorCollector } from "../errorCollection";
import { assertNonNullable } from "decent-portal";
import ClozePartType from "@/game/conclusions/types/ClozePartType";
import ClozePart from "@/game/conclusions/types/ClozePart";
import { getClozeImageCandidateUrls } from "@/game/imageUrlUtil";
import { parseOptions } from "@/common/markdownUtil";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "@/game/conclusions/types/ClozeBlank";
import { findSquareBracketEnclosedTextSegments } from "@/common/regExUtil";
import { normalizeCategoryPhrase, resolveRevealRoomIds, resolveUnlockConclusionIds } from "./commonUtil";
import { createAnswerSet } from "@/game/conclusions/answerSetUtil";
import { resolveBlankCategory } from "./blankCategoryUtil";

function _createBlankAnswerSet(correctAnswers:string[], clozeCategories:Record<string, ClozeCategory>) {
  // Accumulate options and provenance in the existing category traversal order.
  const answers:string[] = [];
  const sourceCategoryIds:string[] = [];
  const normalizedCorrectAnswers = correctAnswers.map(normalizeCategoryPhrase);

  const categoryIds = Object.keys(clozeCategories);

  categoryIds.forEach(categoryId => {
    const allowedValues = clozeCategories[categoryId].allowedValues;
    const normalizedValues = new Set(allowedValues.map(normalizeCategoryPhrase));

    const doesCategoryContainAnyCorrectAnswer = normalizedCorrectAnswers.some(answer => normalizedValues.has(answer));
    if (!doesCategoryContainAnyCorrectAnswer) return; // This category is unrelated to the blank.
    sourceCategoryIds.push(categoryId);
    
    // Add all unique values for this category to the returned available answers for the blank.
    allowedValues.forEach(value => {
      if (answers.includes(value)) return;
      answers.push(value);
    });
  });

  // Covering the case of correct answers not matching against any category, add the correct answers as options.
  const categoryAnswerCount = answers.length;
  correctAnswers.forEach(answer => {
    if (answers.includes(answer)) return;
    answers.push(answer);
  });

  // Construct the authoritative answer set without reordering its options.
  const isExactCategory = sourceCategoryIds.length === 1 && answers.length === categoryAnswerCount;
  return createAnswerSet(answers, sourceCategoryIds, isExactCategory);
}

/** Parses one cloze blank into its answer and available category values. */
export function createClozeBlankFromTemplateText(blankText:string, clozeCategories:Record<string, ClozeCategory>,
  reportError:(message:string) => void):ClozeBlank|null {
  // Resolve options before computing indexes using the existing normalized matching semantics.
  const correctAnswers = parseOptions(blankText);
  if (!resolveBlankCategory(correctAnswers, clozeCategories, reportError)) return null;
  const answerSet = _createBlankAnswerSet(correctAnswers, clozeCategories);
  const normalizedAnswers = answerSet.answers.map(normalizeCategoryPhrase);
  const correctAnswerIndexes = correctAnswers
    .map(correctAnswer => normalizedAnswers.indexOf(normalizeCategoryPhrase(correctAnswer)))
    .filter((answerIndex, index, allAnswerIndexes) => answerIndex >= 0 && allAnswerIndexes.indexOf(answerIndex) === index);

  // Keep selection state independent of the immutable answer-set metadata.
  return {
    type:ClozePartType.blank,
    answerSet,
    correctAnswerIndexes,
    playerAnswerIndex:UNSPECIFIED_ANSWER
  };
}

function _findNextSeparatorStartIndex(text:string, startIndex:number):number {
  return text.indexOf('---', startIndex);
}

function _findNextImageEndIndex(text:string, startIndex:number):number {
  return text.indexOf(')', startIndex + 1);
}

function _isImageToken(text:string, startIndex:number, endIndex:number):boolean {
  if (startIndex < 0 || endIndex <= startIndex + 1) return false;
  const imageUrl = text.slice(startIndex + 1, endIndex).trim();
  return imageUrl.length > 0 && !/\s/.test(imageUrl);
}

function _findNextSpecialToken(text:string, startIndex:number):{ type:'blank'|'image'|'separator', startIndex:number, endIndex:number }|null {
  const emptyBlankStartIndex = text.indexOf('[]', startIndex);
  const emptyBlank = emptyBlankStartIndex >= 0
    ? { type:'blank' as const, startIndex:emptyBlankStartIndex, endIndex:emptyBlankStartIndex + 2 } : null;
  const nextBlankSegment = findSquareBracketEnclosedTextSegments(text.slice(startIndex))[0] || null;
  const nextBlank = nextBlankSegment ? {
    type:'blank' as const,
    startIndex:startIndex + nextBlankSegment.startIndex,
    endIndex:startIndex + nextBlankSegment.endIndex
  } : null;
  const nextSeparatorStartIndex = _findNextSeparatorStartIndex(text, startIndex);
  const nextSeparator = nextSeparatorStartIndex >= 0 ? {
    type:'separator' as const,
    startIndex:nextSeparatorStartIndex,
    endIndex:nextSeparatorStartIndex + 3
  } : null;
  const nextImageStartIndex = text.indexOf('(', startIndex);
  const nextImageEndIndex = nextImageStartIndex >= 0 ? _findNextImageEndIndex(text, nextImageStartIndex) : -1;
  const nextImage = nextImageStartIndex >= 0 && _isImageToken(text, nextImageStartIndex, nextImageEndIndex) ? {
    type:'image' as const,
    startIndex:nextImageStartIndex,
    endIndex:nextImageEndIndex + 1
  } : null;
  return [emptyBlank, nextBlank, nextImage, nextSeparator]
    .filter(token => token !== null)
    .sort((token1, token2) => token1!.startIndex - token2!.startIndex)[0] || null;
}

function _parseClozeTemplateToParts(clozeTemplate:string, clozeCategories:Record<string, ClozeCategory>,
  conclusionName:string, errors:ErrorCollector):ClozePart[] {
  if (!clozeTemplate.trim()) return [];

  const parts:ClozePart[] = [];
  let currentIndex = 0;
  let blankNo = 0;

  while (currentIndex < clozeTemplate.length) {
    const nextToken = _findNextSpecialToken(clozeTemplate, currentIndex);
    if (!nextToken) {
      const trailingText = clozeTemplate.slice(currentIndex);
      if (trailingText.length > 0) parts.push({ type:ClozePartType.text, text:trailingText });
      break;
    }

    const textBeforeToken = clozeTemplate.slice(currentIndex, nextToken.startIndex);
    if (textBeforeToken.length > 0) parts.push({type:ClozePartType.text, text:textBeforeToken});

    if (nextToken.type === 'blank') {
      const blankText = clozeTemplate.slice(nextToken.startIndex + 1, nextToken.endIndex - 1);
      blankNo++;
      const blank = createClozeBlankFromTemplateText(blankText, clozeCategories, message =>
        errors.addAt(`Conclusion "${conclusionName}", blank ${blankNo}: ${message}`,
          ['conclusions', conclusionName], '* conclusion=', `[${blankText}]`));
      if (blank) parts.push(blank);
    } else if (nextToken.type === 'image') {
      parts.push({
        type:ClozePartType.image,
        imageUrl:getClozeImageCandidateUrls(clozeTemplate.slice(nextToken.startIndex + 1, nextToken.endIndex - 1).trim())
      });
    } else {
      parts.push({type:ClozePartType.separator});
    }

    currentIndex = nextToken.endIndex;
  }

  return parts;
}

function _parseConclusion(conclusionName:string, sectionText:string, rooms:ReadonlyArray<Room>, conclusionIds:string[], 
  clozeCategories:Record<string, ClozeCategory>, initiallyObscuredRoomIds:ReadonlySet<string>,
  errors:ErrorCollector):Conclusion|null {
  const originalErrorCount = errors.count;
  const variables = createSectionVariables(sectionText, ['conclusions', conclusionName], errors);
  const clozeTemplate = variables.conclusion?.value;
  if (!clozeTemplate) {
    if (normalizeId(conclusionName) !== 'identities') {
      errors.addAt(`Missing "conclusion=" line for "${conclusionName}" conclusion.`, ['conclusions', conclusionName]);
    }
    return null;
  }
  const id = normalizeId(conclusionName);
  const title = conclusionName.trim();
  const parts = _parseClozeTemplateToParts(clozeTemplate, clozeCategories, conclusionName, errors);
  const revealRoomIds = resolveRevealRoomIds(conclusionName, variables.revealrooms?.value ?? '', rooms,
    initiallyObscuredRoomIds, errors);
  const unlockConclusionIds = resolveUnlockConclusionIds(conclusionName, variables.unlockconclusions?.value ?? '', conclusionIds, errors);
  const isComplete = false;
  const isLocked = false;
  return errors.count > originalErrorCount ? 
    null : { id, title, parts, isComplete, isLocked, unlockConclusionIds, revealRoomIds }
}

/** Locks conclusions that another conclusion is configured to unlock. */
export function lockConclusionsAsNeeded(conclusions:Conclusion[]) {
  const idsToLock = new Set<string>;
  for(let i = 0; i < conclusions.length; ++i) {
    const { unlockConclusionIds } = conclusions[i];
    unlockConclusionIds.forEach(conclusionId => idsToLock.add(conclusionId));
  }
  for(let i = 0; i < conclusions.length; ++i) {
    const conclusion = conclusions[i];
    if (idsToLock.has(conclusion.id)) conclusion.isLocked = true;
  }
}

/** Parses authored conclusion sections and resolves reveal and unlock references. */
export function parseAuthoredConclusions(conclusionsSectionText:string, rooms:ReadonlyArray<Room>, 
  clozeCategories:Record<string, ClozeCategory>, initiallyObscuredRoomIds:ReadonlySet<string>,
  errors:ErrorCollector):Conclusion[]|null {
  if (!conclusionsSectionText.trim()) return [];
  const originalErrorCount = errors.count;

  const conclusionSections = createNormalizedSectionEntryMap(conclusionsSectionText, 2, 'conclusions', errors);
  const conclusionNames = [...conclusionSections.keys()];
  const conclusionIds = conclusionNames.map(normalizeId);

  const conclusions:Conclusion[] = [];
  for(let i = 0; i < conclusionNames.length; ++i) {
    const conclusionName = conclusionNames[i];
    const entry = conclusionSections.get(conclusionName);
    assertNonNullable(entry);
    const conclusion = _parseConclusion(entry.name, entry.value, rooms, conclusionIds, clozeCategories,
      initiallyObscuredRoomIds, errors);
    if (conclusion) conclusions.push(conclusion);
  }
  return errors.count > originalErrorCount ? null : conclusions;
}
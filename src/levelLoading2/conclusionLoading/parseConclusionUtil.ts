import Conclusion from "@/game/conclusions/types/Conclusion";
import { normalizeId } from "@/game/idUtil";
import Room from "@/game/types/Room";
import ClozeCategory from "./types/ClozeCategory";
import { createNormalizedSectionEntryMap, createSectionVariables } from "../levelFileSectionUtil";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { assertNonNullable } from "decent-portal";
import ClozePartType from "@/game/conclusions/types/ClozePartType";
import ClozePart from "@/game/conclusions/types/ClozePart";
import { getClozeImageCandidateUrls } from "@/game/imageUrlUtil";
import { parseOptions } from "@/common/markdownUtil";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "@/game/conclusions/types/ClozeBlank";
import { findSquareBracketEnclosedTextSegments } from "@/common/regExUtil";
import { normalizeCategoryPhrase, resolveRevealRoomIds, resolveUnlockConclusionIds } from "./commonUtil";

function _createBlankAvailableAnswers(correctAnswers:string[], clozeCategories:Record<string, ClozeCategory>):string[] {
  const availableAnswers:string[] = [];
  const normalizedCorrectAnswers = correctAnswers.map(normalizeCategoryPhrase);

  const categoryIds = Object.keys(clozeCategories);

  categoryIds.forEach(categoryId => {
    const allowedValues = clozeCategories[categoryId].allowedValues;
    const normalizedValues = new Set(allowedValues.map(normalizeCategoryPhrase));

    const doesCategoryContainAnyCorrectAnswer = normalizedCorrectAnswers.some(answer => normalizedValues.has(answer));
    if (!doesCategoryContainAnyCorrectAnswer) return; // This category is unrelated to the blank.
    
    // Add all unique values for this category to the returned available answers for the blank.
    allowedValues.forEach(value => {
      if (availableAnswers.includes(value)) return;
      availableAnswers.push(value);
    });
  });

  // Covering the case of correct answers not matching against any category, add the correct answers as options.
  correctAnswers.forEach(answer => {
    if (availableAnswers.includes(answer)) return;
    availableAnswers.push(answer);
  });

  return availableAnswers;
}

export function createClozeBlankFromTemplateText(blankText:string, clozeCategories:Record<string, ClozeCategory>):ClozeBlank {
  const correctAnswers = parseOptions(blankText);
  const availableAnswers = _createBlankAvailableAnswers(correctAnswers, clozeCategories);
  const normalizedAvailableAnswers = availableAnswers.map(normalizeCategoryPhrase);
  const correctAnswerIndexes = correctAnswers
    .map(correctAnswer => normalizedAvailableAnswers.indexOf(normalizeCategoryPhrase(correctAnswer)))
    .filter((answerIndex, index, allAnswerIndexes) => answerIndex >= 0 && allAnswerIndexes.indexOf(answerIndex) === index);

  return {
    type:ClozePartType.blank,
    availableAnswers,
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
  return [nextBlank, nextImage, nextSeparator]
    .filter(token => token !== null)
    .sort((token1, token2) => token1!.startIndex - token2!.startIndex)[0] || null;
}

function _parseClozeTemplateToParts(clozeTemplate:string, clozeCategories:Record<string, ClozeCategory>):ClozePart[] {
  if (!clozeTemplate.trim()) return [];

  const parts:ClozePart[] = [];
  let currentIndex = 0;

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
      parts.push(createClozeBlankFromTemplateText(blankText, clozeCategories));
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
    clozeCategories:Record<string, ClozeCategory>, errors:ErrorCollector):Conclusion {
  const variables = createSectionVariables(sectionText, ['conclusions', conclusionName], errors);
  const clozeTemplate = variables.conclusion?.value;
  if (!clozeTemplate) {
    errors.addAt(`Missing "conclusion=" line for "${conclusionName}" conclusion.`, ['conclusions', conclusionName]);
  }
  const id = normalizeId(conclusionName);
  const title = conclusionName.trim();
  const parts = _parseClozeTemplateToParts(clozeTemplate, clozeCategories);
  const revealRoomIds = resolveRevealRoomIds(conclusionName, variables.revealRooms?.value ?? '', rooms, errors);
  const unlockConclusionIds = resolveUnlockConclusionIds(conclusionName, variables.unlockConclusions?.value ?? '', conclusionIds, errors);
  const isComplete = false;
  const isLocked = false;
  return { id, title, parts, isComplete, isLocked, unlockConclusionIds, revealRoomIds }
}

function _lockConclusionsAsNeeded(conclusions:Conclusion[]) {
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

export function parseAuthoredConclusions(conclusionsSectionText:string, rooms:ReadonlyArray<Room>, 
      clozeCategories:Record<string, ClozeCategory>, errors:ErrorCollector):Conclusion[] {
  if (!conclusionsSectionText.trim()) return [];

  const conclusionSections = createNormalizedSectionEntryMap(conclusionsSectionText, 2, 'conclusions', errors);
  const conclusionNames = Object.keys(conclusionSections);
  const conclusionIds = conclusionNames.map(normalizeId);

  const conclusions = conclusionNames.map(conclusionName => {
    const entry = conclusionSections.get(conclusionName);
    assertNonNullable(entry);
    return _parseConclusion(entry.name, entry.value, rooms, conclusionIds, clozeCategories, errors);
  });
  _lockConclusionsAsNeeded(conclusions);

  return conclusions;
}
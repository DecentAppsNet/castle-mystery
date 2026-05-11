import { parseNameValueLines, parseOptions, parseSections } from "@/common/markdownUtil";
import { findSquareBracketEnclosedTextSegments } from "@/common/regExUtil";

import ClozeBlank, { UNSPECIFIED_ANSWER } from "./solutions/types/ClozeBlank";
import ClozePart from "./solutions/types/ClozePart";
import ClozePartType from "./solutions/types/ClozePartType";
import Solution from "./solutions/types/Solution";

function _parseSolutionCategoryText(solutionsSection:string):string {
  const lines = solutionsSection.split('\n');
  const firstSubsectionIndex = lines.findIndex(line => line.trim().startsWith('## '));
  const categoryLines = firstSubsectionIndex === -1 ? lines : lines.slice(0, firstSubsectionIndex);
  return categoryLines.join('\n');
}

function _createCategoryOptionsByName(solutionsSection:string):Map<string, string[]> {
  const categoryNameValues = parseNameValueLines(_parseSolutionCategoryText(solutionsSection));
  return new Map(Object.entries(categoryNameValues).map(([categoryName, categoryValue]) => [categoryName, parseOptions(categoryValue)]));
}

function _createBlankAvailableAnswers(correctAnswers:string[], categoryOptionsByName:Map<string, string[]>):string[] {
  const availableAnswers:string[] = [];

  categoryOptionsByName.forEach(categoryOptions => {
    if (!correctAnswers.every(answer => categoryOptions.includes(answer))) return;
    categoryOptions.forEach(option => {
      if (availableAnswers.includes(option)) return;
      availableAnswers.push(option);
    });
  });

  if (!availableAnswers.length) {
    correctAnswers.forEach(answer => {
      if (availableAnswers.includes(answer)) return;
      availableAnswers.push(answer);
    });
  }

  return availableAnswers;
}

function _createClozeBlankFromTemplateText(blankText:string, categoryOptionsByName:Map<string, string[]>):ClozeBlank {
  const correctAnswers = parseOptions(blankText);
  const availableAnswers = _createBlankAvailableAnswers(correctAnswers, categoryOptionsByName);
  const correctAnswerIndexes = correctAnswers
    .map(correctAnswer => availableAnswers.indexOf(correctAnswer))
    .filter((answerIndex, index, allAnswerIndexes) => answerIndex >= 0 && allAnswerIndexes.indexOf(answerIndex) === index);

  return {
    type:ClozePartType.blank,
    availableAnswers,
    correctAnswerIndexes,
    playerAnswerIndex:UNSPECIFIED_ANSWER
  };
}

function _parseClozeTemplateToParts(clozeTemplate:string, categoryOptionsByName:Map<string, string[]>):ClozePart[] {
  if (!clozeTemplate.trim()) return [];

  const parts:ClozePart[] = [];
  let previousIndex = 0;
  const blankSegments = findSquareBracketEnclosedTextSegments(clozeTemplate);

  blankSegments.forEach(blankSegment => {
    const textBeforeBlank = clozeTemplate.slice(previousIndex, blankSegment.startIndex);
    if (textBeforeBlank.length > 0) {
      parts.push({
        type:ClozePartType.text,
        text:textBeforeBlank
      });
    }

    parts.push(_createClozeBlankFromTemplateText(blankSegment.enclosedText, categoryOptionsByName));
    previousIndex = blankSegment.endIndex;
  });

  const trailingText = clozeTemplate.slice(previousIndex);
  if (trailingText.length > 0) {
    parts.push({
      type:ClozePartType.text,
      text:trailingText
    });
  }

  return parts;
}

export function loadSolutionsFromSection(solutionsSection:string):Solution[] {
  const section = solutionsSection || "";
  if (!section.trim()) return [];

  const categoryOptionsByName = _createCategoryOptionsByName(section);
  const solutionSubsections = parseSections(section, 2);

  return Object.entries(solutionSubsections).map(([title, solutionSubsection]) => {
    const nameValues = parseNameValueLines(solutionSubsection);
    const clozeTemplate = nameValues.solution || nameValues.clozeStatement || "";

    return {
      id:title,
      title,
      parts:_parseClozeTemplateToParts(clozeTemplate, categoryOptionsByName),
      isComplete:false
    };
  });
}

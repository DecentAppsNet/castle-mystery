/* This module groups section-tree merge helpers for levelLoading2 importing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { mergeSectionBody } from "./importBodyTokenUtil";
import { serializeSourceMappedSections } from "./importSerializationUtil";
import { createSection, parseSectionTree } from "./importSectionTreeUtil";
import ImportedSection from "./types/ImportedSection";
import SourceMappedText from "./types/SourceMappedText";

function _mergeSectionTrees(levelSections:ImportedSection[], importSections:ImportedSection[]):ImportedSection[] {
  const levelSectionsByName = new Map(levelSections.map(section => [section.normalizedHeading, section]));
  const mergedSections:ImportedSection[] = [];

  levelSections.forEach(levelSection => {
    const importSection = importSections.find(candidate => candidate.normalizedHeading === levelSection.normalizedHeading) || null;
    mergedSections.push(importSection ? _mergeSectionNodes(levelSection, importSection) : levelSection);
  });
  importSections.forEach(importSection => {
    if (levelSectionsByName.has(importSection.normalizedHeading)) return;
    mergedSections.push(importSection);
  });

  return mergedSections;
}

function _mergeSectionNodes(levelSection:ImportedSection|null, importSection:ImportedSection):ImportedSection {
  const mergedLevelSection = levelSection || createSection(importSection.headingText);
  return {
    headingText:mergedLevelSection.headingText,
    normalizedHeading:mergedLevelSection.normalizedHeading,
    depth:mergedLevelSection.depth,
    headingSourceLine:mergedLevelSection.headingSourceLine.filename === '<unknown>'
      ? importSection.headingSourceLine
      : mergedLevelSection.headingSourceLine,
    bodyLines:mergeSectionBody(mergedLevelSection.bodyLines, importSection.bodyLines),
    children:_mergeSectionTrees(mergedLevelSection.children, importSection.children)
  };
}

export function mergeImportIntoLevelSource(levelSource:SourceMappedText, importSource:SourceMappedText):SourceMappedText {
  const levelSections = parseSectionTree(levelSource);
  const importSections = parseSectionTree(importSource);
  if (!levelSections.length) return {
    text:importSource.text.trim(),
    sourceLineMap:importSource.sourceLineMap.slice(0, importSource.text.trim().split('\n').length)
  };
  if (!importSections.length) return {
    text:levelSource.text.trim(),
    sourceLineMap:levelSource.sourceLineMap.slice(0, levelSource.text.trim().split('\n').length)
  };
  return serializeSourceMappedSections(_mergeSectionTrees(levelSections, importSections));
}
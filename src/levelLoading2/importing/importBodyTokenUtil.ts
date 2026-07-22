/* This module groups section-body tokenization and structured-body merge helpers for levelLoading2 importing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { normalizeId } from "@/game/idUtil";
import { beginsWithTimestamp } from "../activityLoading/timestampUtil";
import ImportedLine from "./types/ImportedLine";
import SourceLine from "./types/SourceLine";

type BodyEntry = {
  authoredName:string,
  normalizedName:string,
  value:string,
  hasBulletPrefix:boolean,
  line:ImportedLine,
  sourceLine:SourceLine
};

type BodyToken =
  | { type:'comment', lines:ImportedLine[] }
  | { type:'nameValue', entry:BodyEntry }
  | { type:'timestamp', line:ImportedLine }
  | { type:'fencedCode', lines:ImportedLine[] };

function _isBlankBodyLine(line:ImportedLine):boolean {
  return line.text.trim().length === 0;
}

export function trimBodyLines(lines:ImportedLine[]):ImportedLine[] {
  let startIndex = 0;
  let endIndex = lines.length;
  while (startIndex < endIndex && _isBlankBodyLine(lines[startIndex])) startIndex += 1;
  while (endIndex > startIndex && _isBlankBodyLine(lines[endIndex - 1])) endIndex -= 1;
  return lines.slice(startIndex, endIndex);
}

function _parseBodyEntry(line:ImportedLine):BodyEntry|null {
  const trimmedLine = line.text.trim();
  const hasBulletPrefix = trimmedLine.startsWith('*');
  const contentText = hasBulletPrefix ? trimmedLine.slice(1).trim() : trimmedLine;
  const equalsIndex = contentText.indexOf('=');
  if (equalsIndex === -1) return null;
  const authoredName = contentText.slice(0, equalsIndex).trim();
  if (!authoredName.length) return null;
  return {
    authoredName,
    normalizedName:normalizeId(authoredName),
    value:contentText.slice(equalsIndex + 1).trim(),
    hasBulletPrefix,
    line,
    sourceLine:line.sourceLine
  };
}

function _findFencedCodeBlockEndIndex(lines:ImportedLine[], startIndex:number):number|null {
  if (!lines[startIndex]?.text.trim().startsWith('```')) return null;
  for (let i = startIndex + 1; i < lines.length; ++i) {
    if (lines[i].text.trim().startsWith('```')) return i;
  }
  return lines.length - 1;
}

function _parseBodyTokens(lines:ImportedLine[]):BodyToken[] {
  const trimmedLines = trimBodyLines(lines);
  const tokens:BodyToken[] = [];
  for (let i = 0; i < trimmedLines.length; ++i) {
    const line = trimmedLines[i];
    const fencedCodeEndIndex = _findFencedCodeBlockEndIndex(trimmedLines, i);
    if (fencedCodeEndIndex !== null) {
      tokens.push({ type:'fencedCode', lines:trimmedLines.slice(i, fencedCodeEndIndex + 1) });
      i = fencedCodeEndIndex;
      continue;
    }

    const bodyEntry = _parseBodyEntry(line);
    if (bodyEntry) {
      tokens.push({ type:'nameValue', entry:bodyEntry });
      continue;
    }

    if (beginsWithTimestamp(line.text)) {
      tokens.push({ type:'timestamp', line });
      continue;
    }

    tokens.push({ type:'comment', lines:[line] });
  }
  return tokens;
}

function _serializeBodyEntry(entry:BodyEntry):ImportedLine {
  return {
    text:entry.hasBulletPrefix
      ? `* ${entry.authoredName}=${entry.value}`
      : `${entry.authoredName}=${entry.value}`,
    sourceLine:entry.sourceLine
  };
}

function _flattenBodyTokens(tokens:BodyToken[]):ImportedLine[] {
  return tokens.flatMap(token => {
    switch(token.type) {
      case 'comment': return token.lines;
      case 'nameValue': return [_serializeBodyEntry(token.entry)];
      case 'timestamp': return [token.line];
      case 'fencedCode': return token.lines;
    }
  });
}

function _mergeStructuredBody(levelBodyLines:ImportedLine[], importBodyLines:ImportedLine[]):ImportedLine[] {
  const levelTokens = _parseBodyTokens(levelBodyLines);
  const importTokens = _parseBodyTokens(importBodyLines);
  const levelNameValueIds = new Set(levelTokens.flatMap(token => token.type === 'nameValue' ? [token.entry.normalizedName] : []));
  const hasLevelFencedCode = levelTokens.some(token => token.type === 'fencedCode');
  const mergedTokens = [...levelTokens];
  let hasMergedFencedCode = hasLevelFencedCode;

  importTokens.forEach(token => {
    switch(token.type) {
      case 'comment':
        return;
      case 'nameValue':
        if (levelNameValueIds.has(token.entry.normalizedName)) return;
        mergedTokens.push(token);
        levelNameValueIds.add(token.entry.normalizedName);
        return;
      case 'timestamp':
        mergedTokens.push(token);
        return;
      case 'fencedCode':
        if (hasMergedFencedCode) return;
        mergedTokens.push(token);
        hasMergedFencedCode = true;
        return;
    }
  });

  return _flattenBodyTokens(mergedTokens);
}

export function mergeSectionBody(levelBodyLines:ImportedLine[], importBodyLines:ImportedLine[]):ImportedLine[] {
  const trimmedLevelBodyLines = trimBodyLines(levelBodyLines);
  const trimmedImportBodyLines = trimBodyLines(importBodyLines);
  if (!trimmedLevelBodyLines.length) return trimmedImportBodyLines;
  if (!trimmedImportBodyLines.length) return trimmedLevelBodyLines;
  return _mergeStructuredBody(trimmedLevelBodyLines, trimmedImportBodyLines);
}
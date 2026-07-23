import { parseFirstFencedCodeBlockLines, parseOptions, parseUniqueNameValueLines } from "@/common/markdownUtil";
import ErrorCollector from "../errorCollection/ErrorCollector";
import LegendGrid from "./types/LegendGrid";
import LegendGridEntry from "./types/LegendGridEntry";
import { assertNonNullable } from "decent-portal";
import { normalizeId } from "@/game/idUtil";

function _isIgnoredGridTileChar(tileChar:string):boolean {
  return tileChar === '.' || tileChar === '#' || tileChar === ' ' || tileChar === '\t';
}

function _doesLegendContainId(legend:Record<string,string>, id:string):boolean {
  return Object.values(legend).map(normalizeId).includes(id);
}

function _createLegend(sectionText:string, errors:ErrorCollector):Record<string, string> {
  const allNameValueLines = parseUniqueNameValueLines(sectionText, 'grid legend', false);
  const legend:Record<string, string> = {};
  Object.keys(allNameValueLines).forEach(variableName => { // A 1-character variable name is considered part of the legend.
    if (variableName.length === 1) {
      const value = allNameValueLines[variableName];
      assertNonNullable(value);
      const id = normalizeId(value);
      if (_doesLegendContainId(legend, id)) {
        errors.addParseError('DUPELEGROOMID', `unique room ID`, 
          `duplicate ID "${id}" used for multiple legend entries`, 
          'Legend tiles should reference unique IDs.', 0, 0);
      }
      legend[variableName] = value; // Legend stores authored name rather than ID.
    }
  });
  return legend;
}

function _authoredNameToIds(authoredName:string):string[] {
  const tokens = parseOptions(authoredName);
  return tokens.map(normalizeId);
}

export function parseLegendGrid(sectionText:string, errors:ErrorCollector):LegendGrid|null {
  const originalErrorCount = errors.errorCount;
  const entries:LegendGridEntry[] = [];
  const legend = _createLegend(sectionText, errors);
  const gridLines = parseFirstFencedCodeBlockLines(sectionText);
  const usedLegendEntries:Set<string> = new Set<string>();

  // Populate the legend entries, while tracking which legend entries were used.
  gridLines.forEach((line, row) => {
    Array.from(line).forEach((tileChar, col) => {
      if (_isIgnoredGridTileChar(tileChar)) return;
      const authoredName = legend[tileChar];
      if (!authoredName) {
        errors.addParseError('BADLEGREF', 'legend tile "${tileChar}" to have corresponding legend entry', 'missing legend entry', 
        'Make the legend and map grid match.', 0, 0);
      }
      usedLegendEntries.add(tileChar);
      const ids:string[] = _authoredNameToIds(authoredName); // Authored name might be `x` or `x | y | z`.
      ids.forEach(id => entries.push({col, row, id, authoredName}));
    });
  });

  // Check for unused legend entries.
  Object.keys(legend).forEach(legendTileChar => {
    if (!usedLegendEntries.has(legendTileChar)) {
      errors.addParseError('UNUSEDLEGTILE', 'legend tile "${tileChar}" to be used in grid', 'missing tile from grid', 
        'Make the legend and map grid match.', 0, 0);
    }
  });

  return errors.errorCount <= originalErrorCount ? { entries } : null;
}

export function getUniqueIdsFromLegendGrid(legendGrid:LegendGrid):string[] {
  const ids:Set<string> = new Set<string>();
  legendGrid.entries.forEach(entry => ids.add(entry.id));
  return [...ids];
}
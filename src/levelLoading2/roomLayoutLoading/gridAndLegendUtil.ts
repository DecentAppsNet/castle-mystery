import ErrorCollector from "../errorCollection/ErrorCollector";

export type LegendTile = {
  entryId:string,
  row:number,
  col:number
};

function _isIgnoredGridTileChar(tileChar:string):boolean {
  return tileChar === '.' || tileChar === '#' || tileChar === ' ' || tileChar === '\t';
}

export function findLegendEntryText(tileChar:string, legend:Record<string, string>, row:number, col:number, contextLabel:string, errors:ErrorCollector):string|null {
  if (_isIgnoredGridTileChar(tileChar)) return null;
  const entryText = legend[tileChar] ?? null;
  if (!entryText) {
    errors.addParseErrorAtLine('NOLEGFORTILE', 
      `${contextLabel} tile "${tileChar}" at row ${row + 1}, col ${col + 1} would have a corresponding legend entry`, 
      `legend does not specify ${tileChar}`, `Fix the map or the legend so every tile has a legend entry.`, 0, 0, 0, 'map');
  }
  return entryText;
}

export function findLegendTilesInGrid(gridLines:string[], legend:Record<string, string>, errors:ErrorCollector):LegendTile[] {
  const legendTiles:LegendTile[] = [];
  gridLines.forEach((line, row) => {
    Array.from(line).forEach((tileChar, col) => {
      const entryId = findLegendEntryText(tileChar, legend, row, col, 'room', errors);
      if (!entryId) return;
      legendTiles.push({ entryId, row, col });
    });
  });
  return legendTiles;
}

export function findUsedLegendChars(gridLines:string[]):Set<string> {
  const usedLegendChars = new Set<string>();
  gridLines.forEach(line => {
    Array.from(line).forEach(tileChar => {
      if (_isIgnoredGridTileChar(tileChar)) return;
      usedLegendChars.add(tileChar);
    });
  });
  return usedLegendChars;
}

export function validateLegendMatchesGrid(legend:Record<string, string>, usedLegendChars:Set<string>, errors:ErrorCollector):boolean {
  const orginalErrorCount = errors.errorCount;
  Object.keys(legend).forEach(tileChar => {
    if (tileChar === '.' || usedLegendChars.has(tileChar)) return;
    errors.addParseErrorAtLine('UNUSEDMAPLEGTILE', 'map legend tile "${tileChar}" to be used in map grid', 'missing tile from grid', 
      'Make the legend and map grid match.', 0, 0, 0, 'map');
  });
  return errors.errorCount <= orginalErrorCount;
}
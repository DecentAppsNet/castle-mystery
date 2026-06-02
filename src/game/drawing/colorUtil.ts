/* This module groups shared drawing-color helpers for channel clamping and color interpolation.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

function _clampColorChannel(value:number):number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function _clampInterpolationAmount(amount:number):number {
  return Math.max(0, Math.min(1, amount));
}

function _expandShortHexColor(hexColor:string):string {
  return hexColor.split('').map(character => `${character}${character}`).join('');
}

function _parseHexColor(color:string):[number, number, number] {
  const normalizedColor = color.trim().replace(/^#/, '');
  const expandedColor = normalizedColor.length === 3 ? _expandShortHexColor(normalizedColor) : normalizedColor;
  if (!/^[0-9a-fA-F]{6}$/.test(expandedColor)) throw new Error(`invalid hex color '${color}'`);
  return [
    Number.parseInt(expandedColor.slice(0, 2), 16),
    Number.parseInt(expandedColor.slice(2, 4), 16),
    Number.parseInt(expandedColor.slice(4, 6), 16)
  ];
}

function _interpolateColorChannel(fromChannel:number, toChannel:number, amount:number):number {
  return _clampColorChannel(fromChannel + (toChannel - fromChannel) * amount);
}

export function interpolateColor(fromColor:string, toColor:string, amount:number):string {
  const clampedAmount = _clampInterpolationAmount(amount);
  const [fromRed, fromGreen, fromBlue] = _parseHexColor(fromColor);
  const [toRed, toGreen, toBlue] = _parseHexColor(toColor);
  const red = _interpolateColorChannel(fromRed, toRed, clampedAmount);
  const green = _interpolateColorChannel(fromGreen, toGreen, clampedAmount);
  const blue = _interpolateColorChannel(fromBlue, toBlue, clampedAmount);
  return `rgb(${red} ${green} ${blue})`;
}
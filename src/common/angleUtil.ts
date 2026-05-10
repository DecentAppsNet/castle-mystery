export function normalizeAngle(angle:number):number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

export function calcAngleBetweenPoints(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.atan2(toY - fromY, toX - fromX);
}

export function calcShortestAngleDelta(fromAngle:number, toAngle:number):number {
  return normalizeAngle(toAngle - fromAngle);
}

export function interpolateAngle(fromAngle:number, toAngle:number, interpolateAmount:number):number {
  return normalizeAngle(fromAngle + calcShortestAngleDelta(fromAngle, toAngle) * interpolateAmount);
}
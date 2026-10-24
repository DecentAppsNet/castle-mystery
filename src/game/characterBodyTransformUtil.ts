/* This file provides pure affine composition and pivot attachment for character body geometry.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import BodyPartTransform from './types/BodyPartTransform';
import Point from './types/Point';

export function transformBodyPoint(transform:BodyPartTransform, point:Point):Point {
  return [
    transform.horizontalX * point[0] + transform.verticalX * point[1] + transform.translateX,
    transform.horizontalY * point[0] + transform.verticalY * point[1] + transform.translateY
  ];
}

export function composeBodyTransforms(parent:BodyPartTransform, child:BodyPartTransform):BodyPartTransform {
  return {
    horizontalX:parent.horizontalX * child.horizontalX + parent.verticalX * child.horizontalY,
    horizontalY:parent.horizontalY * child.horizontalX + parent.verticalY * child.horizontalY,
    verticalX:parent.horizontalX * child.verticalX + parent.verticalX * child.verticalY,
    verticalY:parent.horizontalY * child.verticalX + parent.verticalY * child.verticalY,
    translateX:parent.horizontalX * child.translateX + parent.verticalX * child.translateY + parent.translateX,
    translateY:parent.horizontalY * child.translateX + parent.verticalY * child.translateY + parent.translateY
  };
}

export function createBodyAttachmentTransform(connectionPoint:Point, pivotPoint:Point,
    rotationRadians:number = 0):BodyPartTransform {
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);
  return {
    horizontalX:cosine,
    horizontalY:sine,
    verticalX:-sine,
    verticalY:cosine,
    translateX:connectionPoint[0] - cosine * pivotPoint[0] + sine * pivotPoint[1],
    translateY:connectionPoint[1] - sine * pivotPoint[0] - cosine * pivotPoint[1]
  };
}
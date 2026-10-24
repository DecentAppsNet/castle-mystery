/* This file fits face images into logical head slots and calculates their transformed bounds without drawing.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import BodyPart from './types/BodyPart';
import ResolvedBodyPart from './types/ResolvedBodyPart';
import Rect from '../types/Rect';
import { FacingDirection } from '../types/Character';
import { createRect } from '../rectUtil';
import { composeBodyTransforms, createBodyAttachmentTransform, transformBodyRect } from './characterBodyTransformUtil';

/** Adds a draw-time neck rotation without changing the base placement; radians retain their visual direction under facing. */
export function rotateHeadPose(head:ResolvedBodyPart, facing:FacingDirection, radians:number):ResolvedBodyPart {
  const pivot = head.part.pivotPoint;
  const rotation = createBodyAttachmentTransform(pivot, pivot, facing === 'left' ? -radians : radians);
  return { part:head.part, transform:composeBodyTransforms(head.transform, rotation) };
}

/** Returns a centered, aspect-preserving local game-unit fit; null selects fallback for unusable image dimensions. */
export function fitHeadImage(head:Pick<BodyPart, 'width'|'height'>,
    imageWidth:number, imageHeight:number):Rect|null {
  if (imageWidth <= 0 || imageHeight <= 0) return null;
  const scale = Math.min(head.width / imageWidth, head.height / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return createRect((head.width - width) / 2, (head.height - height) / 2, width, height);
}

/** Returns fitted image bounds in the head transform's output units; null means use the head fallback bounds. */
export function getHeadImageBounds(head:ResolvedBodyPart, imageWidth:number, imageHeight:number):Rect|null {
  const imageRect = fitHeadImage(head.part, imageWidth, imageHeight);
  return imageRect ? transformBodyRect(head.transform, imageRect) : null;
}
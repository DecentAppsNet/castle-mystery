import { describe, expect, it } from 'vitest';

import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { findCharacterPose } from '../itineraryUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import WalkEvent from '../types/itineraryEvents/WalkEvent';
import sideViewText from '../../../public/levels/sideView.md?raw';

describe('side view integration', () => {
  it('keeps Simon on the beeline during horizontal waypoint walks', () => {
    const level = loadLevelFromText(sideViewText, 'sideView.md');
    const simon = level.characters.find(character => character.id === 'simon');

    expect(simon).toBeDefined();

    const horizontalWalkEvents = simon!.itinerary
      .filter(event => event.type === ItineraryEventType.WALK)
      .map(event => event as WalkEvent)
      .filter(event => event.fromPosition.y === event.toPosition.y);

    expect(horizontalWalkEvents.length).toBeGreaterThan(0);

    horizontalWalkEvents.forEach(event => {
      const midpointTime = event.startTime + event.duration / 2;
      const pose = findCharacterPose(simon!, midpointTime);

      expect(pose.position.y).toBe(event.fromPosition.y);
      expect(pose.position.x).toBeGreaterThan(Math.min(event.fromPosition.x, event.toPosition.x));
      expect(pose.position.x).toBeLessThan(Math.max(event.fromPosition.x, event.toPosition.x));
    });
  });
});
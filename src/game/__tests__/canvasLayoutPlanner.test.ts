import { describe, expect, it } from 'vitest';

import CanvasLayoutPlanner from '../CanvasLayoutPlanner';

describe('canvasLayoutPlanner', () => {
  describe('reserveRect()/findBestPopoverRect()', () => {
    it('places a popover centered above the anchor when no reserved rect overlaps', () => {
      const planner = new CanvasLayoutPlanner(200, 120);

      expect(planner.findBestPopoverRect({ x:40, y:30, width:20, height:10 }, 50, 20)).toEqual({
        x:25,
        y:5,
        width:50,
        height:20
      });
    });

    it('moves the popover upward above the topmost overlapping reserved rect', () => {
      const planner = new CanvasLayoutPlanner(220, 160);
      planner.reserveRect({ x:50, y:55, width:80, height:20 });
      planner.reserveRect({ x:40, y:20, width:100, height:25 });

      expect(planner.findBestPopoverRect({ x:70, y:40, width:20, height:10 }, 60, 20)).toEqual({
        x:50,
        y:0,
        width:60,
        height:20
      });
    });

    it('treats contained reserved rects as overlaps', () => {
      const planner = new CanvasLayoutPlanner(240, 160);
      planner.reserveRect({ x:85, y:50, width:10, height:10 });

      expect(planner.findBestPopoverRect({ x:70, y:70, width:40, height:15 }, 60, 30)).toEqual({
        x:60,
        y:15,
        width:60,
        height:30
      });
    });

    it('clamps the preferred x position into the canvas when the popover fits', () => {
      const planner = new CanvasLayoutPlanner(180, 120);

      expect(planner.findBestPopoverRect({ x:170, y:25, width:8, height:8 }, 40, 20)).toEqual({
        x:140,
        y:0,
        width:40,
        height:20
      });
    });

    it('centers the popover when it is wider than the canvas', () => {
      const planner = new CanvasLayoutPlanner(100, 120);

      expect(planner.findBestPopoverRect({ x:40, y:20, width:20, height:10 }, 140, 25)).toEqual({
        x:-20,
        y:0,
        width:140,
        height:25
      });
    });

    it('keeps seeking upward rather than falling below the anchor when the anchor rect is reserved', () => {
      const planner = new CanvasLayoutPlanner(240, 160);
      planner.reserveRect({ x:70, y:60, width:40, height:70 });

      expect(planner.findBestPopoverRect({ x:70, y:60, width:40, height:70 }, 60, 25)).toEqual({
        x:60,
        y:30,
        width:60,
        height:25
      });
    });

    it('falls back to the canvas top when no non-overlapping placement exists above', () => {
      const planner = new CanvasLayoutPlanner(240, 200);
      planner.reserveRect({ x:40, y:0, width:120, height:50 });

      expect(planner.findBestPopoverRect({ x:70, y:30, width:20, height:10 }, 60, 20)).toEqual({
        x:50,
        y:0,
        width:60,
        height:20
      });
    });

    it('avoids top fallback for the logged mousewheel repro and accepts the available above-anchor placement', () => {
      const planner = new CanvasLayoutPlanner(1200, 1200);

      planner.reserveRect({ x:601.0215233291755, y:478.5583148051124, width:118.39494484280033, height:154.50540301985444 });

      expect(planner.findBestPopoverRect(
        { x:601.0215233291755, y:478.5583148051124, width:118.39494484280033, height:154.50540301985444 },
        371.34017295333035,
        186.2817767253285
      )).toEqual({
        x:474.5489092739105,
        y:287.2765380797839,
        width:371.34017295333035,
        height:186.2817767253285
      });
    });

  });
});
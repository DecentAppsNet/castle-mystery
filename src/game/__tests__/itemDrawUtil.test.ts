// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it, vi } from 'vitest';

import { drawItemAtCanvasPosition } from '../drawing/itemDrawUtil';
import Item from '../types/Item';

function _createContextStub() {
  return {
    save:vi.fn(),
    restore:vi.fn(),
    fillText:vi.fn(),
    textAlign:'left',
    textBaseline:'alphabetic',
    fillStyle:'#000',
    font:''
  } as unknown as CanvasRenderingContext2D;
}

function _createItem(isExamined:boolean):Item {
  return {
    id:'book',
    title:'Book',
    displayChar:'B',
    position:{ x:1, y:1 },
    description:'A book.',
    isDiscovered:true,
    isExamined
  };
}

describe('itemDrawUtil', () => {
  it('omits the label for unexamined items', () => {
    const context = _createContextStub();

    drawItemAtCanvasPosition(_createItem(false), 10, 20, { glyphFontSize:16, labelFontSize:10, labelOffsetY:12 }, context);

    expect(context.fillText).toHaveBeenCalledTimes(1);
    expect(context.fillText).toHaveBeenCalledWith('B', 10, 20);
  });

  it('draws the label for examined items', () => {
    const context = _createContextStub();

    drawItemAtCanvasPosition(_createItem(true), 10, 20, { glyphFontSize:16, labelFontSize:10, labelOffsetY:12 }, context);

    expect(context.fillText).toHaveBeenCalledTimes(2);
    expect(context.fillText).toHaveBeenNthCalledWith(1, 'B', 10, 20);
    expect(context.fillText).toHaveBeenNthCalledWith(2, 'Book', 10, 32);
  });
});

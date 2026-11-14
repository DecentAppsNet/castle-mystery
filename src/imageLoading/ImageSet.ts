/* This file defines the ImageSet class skeleton for loading, looking up, and drawing bounded image assets.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from 'decent-portal';
import ImageAsset from './types/ImageAsset';

class ImageSet {
  private readonly _imagesByUrl = new Map<string, ImageAsset>();

  /** Returns a fully loaded asset, or null. Never starts or waits for loading. */
  findImage(url:string):ImageAsset|null {
    return this._imagesByUrl.get(url) ?? null;
  }

  /**
   * Fetch and decode the image, calculate visible bounds, then register and return it.
   * Reject on image loading or analysis failure; never register a partial asset.
   * Use baseUrl() for fetches. loadPunchMask requests an optional .punch.png sidecar;
   * an absent sidecar is not a loading failure.
   *
   * Assert that the URL is not already registered when this call starts.
   * No in-flight cache: concurrent duplicate calls may independently load and register.
   * Callers deduplicate URLs, choose mask options once, and await all loading before use.
   *
   * ImageAsset will gain visibleSourceRect:Rect|null in original-image pixels.
   * Reuse the popover scan with alpha >= 16; null means fully transparent.
   * Preserve the original bitmap and punch mask, including their padding.
   */
  async loadImage(_url:string, _loadPunchMask:boolean = false):Promise<ImageAsset> {
    throw new Error('ImageSet.loadImage is not implemented');
  }

  /** Looks up a required loaded image and draws its visible bounds. */
  findAndDrawImage(url:string, destX:number, destY:number, destWidth:number,
      destHeight:number, context:CanvasRenderingContext2D):void {
    const imageAsset = this.findImage(url);
    assertNonNullable(imageAsset, `Missing loaded image asset ${url}`);
    this.drawImage(imageAsset, destX, destY, destWidth, destHeight, context);
  }

  /**
   * Blit visibleSourceRect into the destination rectangle; null bounds draw nothing.
   * Destination dimensions describe visible content, not the padded original image.
   * Callers control aspect ratio and retain responsibility for canvas state.
   * Padding-dependent callers use ImageAsset.image directly instead of this method.
   */
  drawImage(_imageAsset:ImageAsset, _destX:number, _destY:number, _destWidth:number,
      _destHeight:number, _context:CanvasRenderingContext2D):void {
    throw new Error('ImageSet.drawImage is not implemented');
  }
}

export default ImageSet;
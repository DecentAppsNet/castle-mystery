/* This file defines ImageSet for loading, looking up, and drawing bounded image assets.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from 'decent-portal';
import { baseUrl } from '@/common/urlUtil';
import { createImageAsset } from './imageAssetUtil';
import ImageAsset from './types/ImageAsset';

async function _loadOptionalPunchMaskImage(url:string):Promise<ImageBitmap|null> {
  if (!url.toLowerCase().endsWith('.png')) return null;
  const maskUrl = url.slice(0, -4) + '.punch.png';

  // Sidecars are optional, including absent, non-image, and undecodable responses.
  try {
    const response = await fetch(baseUrl(maskUrl));
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}

class ImageSet {
  private readonly _imagesByUrl = new Map<string, ImageAsset>();

  get size():number {
    return this._imagesByUrl.size;
  }

  get(url:string):ImageAsset|undefined {
    return this._imagesByUrl.get(url);
  }

  has(url:string):boolean {
    return this._imagesByUrl.has(url);
  }

  set(url:string, imageAsset:ImageAsset):this {
    this._imagesByUrl.set(url, imageAsset);
    return this;
  }

  /** Returns a fully loaded asset, or null. Never starts or waits for loading. */
  findImage(url:string):ImageAsset|null {
    return this._imagesByUrl.get(url) ?? null;
  }

  /**
   * Fetch and decode the image, calculate visible bounds, then register and return it.
   * Reject on image loading or analysis failure; never register a partial asset.
    * Use baseUrl() for fetches. usePunchMaskIfAvailable requests an optional .punch.png sidecar;
   * an absent sidecar is not a loading failure.
   *
   * Assert that the URL is not already registered when this call starts.
   * No in-flight cache: concurrent duplicate calls may independently load and register.
   * Callers deduplicate URLs, choose mask options once, and await all loading before use.
   *
    * ImageAsset.visibleSourceRect uses original-image pixels.
    * Analyze alpha >= 16 once; null means fully transparent.
   * Preserve the original bitmap and punch mask, including their padding.
   */
  async loadImage(url:string, usePunchMaskIfAvailable:boolean = false):Promise<ImageAsset> {
    assert(!this._imagesByUrl.has(url), `Image asset already loaded ${url}`);

    // Analyze the primary image before optionally completing it with a sidecar.
    try {
      const response = await fetch(baseUrl(url));
      if (!response.ok) throw new Error(`Image fetch failed (${response.status})`);
      const imageAsset = createImageAsset(await createImageBitmap(await response.blob()));
      const punchMaskImage = usePunchMaskIfAvailable ? await _loadOptionalPunchMaskImage(url) : null;
      const completeAsset = { ...imageAsset, punchMaskImage };
      this._imagesByUrl.set(url, completeAsset);
      return completeAsset;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not load image ${url}: ${reason}`, { cause:error });
    }
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
  drawImage(imageAsset:ImageAsset, destX:number, destY:number, destWidth:number,
      destHeight:number, context:CanvasRenderingContext2D):void {
    const bounds = imageAsset.visibleSourceRect;
    if (!bounds) return;
    context.drawImage(imageAsset.image, bounds.x, bounds.y, bounds.width, bounds.height,
      destX, destY, destWidth, destHeight);
  }
}

export default ImageSet;
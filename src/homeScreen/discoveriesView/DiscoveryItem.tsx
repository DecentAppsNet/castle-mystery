import type { ReactNode } from 'react';
import styles from './DiscoveryItem.module.css';

type Props = {
  urls:readonly string[]
};

type DiscoveryItemLayer = {
  key:string,
  opacity:number,
  widthVh:number,
  heightVh:number,
  leftVh:number,
  topVh:number
};

const TARGET_BOUNDING_RECT_SIZE_VH = 4.1;
const THREE_IMAGE_BASE_SIZE_VH = 3.1;
const THREE_IMAGE_HORIZONTAL_STAGGER_VH = 1;
const THREE_IMAGE_VERTICAL_STAGGER_VH = 0.5;
const EMPTY_CIRCLE_INSET_VH = 0.35;
const TWO_IMAGE_SMALL_SCALE = 0.8;
const TWO_IMAGE_SMALL_OFFSET_VH = 0.55;

const THREE_IMAGE_LAYERS:readonly DiscoveryItemLayer[] = [
  {
    key:'top',
    opacity:0.5,
    widthVh:THREE_IMAGE_BASE_SIZE_VH * 0.7,
    heightVh:THREE_IMAGE_BASE_SIZE_VH * 0.7,
    leftVh:0,
    topVh:0
  },
  {
    key:'middle',
    opacity:0.75,
    widthVh:THREE_IMAGE_BASE_SIZE_VH * 0.9,
    heightVh:THREE_IMAGE_BASE_SIZE_VH * 0.9,
    leftVh:THREE_IMAGE_HORIZONTAL_STAGGER_VH,
    topVh:THREE_IMAGE_VERTICAL_STAGGER_VH
  },
  {
    key:'base',
    opacity:1,
    widthVh:THREE_IMAGE_BASE_SIZE_VH,
    heightVh:THREE_IMAGE_BASE_SIZE_VH,
    leftVh:THREE_IMAGE_HORIZONTAL_STAGGER_VH * 2,
    topVh:THREE_IMAGE_VERTICAL_STAGGER_VH * 2
  }
];

function _renderImageLayer(url:string, layer:DiscoveryItemLayer) {
  return <img
    key={layer.key}
    className={styles.image}
    src={url}
    alt=""
    style={{
      width:`${layer.widthVh}vh`,
      height:`${layer.heightVh}vh`,
      left:`${layer.leftVh}vh`,
      top:`${layer.topVh}vh`,
      opacity:layer.opacity
    }}
  />;
}

function _renderZeroImages() {
  return <div
    className={styles.emptyCircle}
    style={{
      width:`${TARGET_BOUNDING_RECT_SIZE_VH - EMPTY_CIRCLE_INSET_VH * 2}vh`,
      height:`${TARGET_BOUNDING_RECT_SIZE_VH - EMPTY_CIRCLE_INSET_VH * 2}vh`,
      left:`${EMPTY_CIRCLE_INSET_VH}vh`,
      top:`${EMPTY_CIRCLE_INSET_VH}vh`
    }}
  />;
}

function _renderOneImage(url:string) {
  return _renderImageLayer(url, {
    key:'single',
    opacity:1,
    widthVh:TARGET_BOUNDING_RECT_SIZE_VH,
    heightVh:TARGET_BOUNDING_RECT_SIZE_VH,
    leftVh:0,
    topVh:0
  });
}

function _renderTwoImages(urls:readonly string[]) {
  const smallerSizeVh = TARGET_BOUNDING_RECT_SIZE_VH - TWO_IMAGE_SMALL_OFFSET_VH * 2;

  return [
    _renderImageLayer(urls[0], {
      key:'smaller',
      opacity:0.75,
      widthVh:smallerSizeVh * TWO_IMAGE_SMALL_SCALE,
      heightVh:smallerSizeVh * TWO_IMAGE_SMALL_SCALE,
      leftVh:0,
      topVh:0
    }),
    _renderImageLayer(urls[1], {
      key:'larger',
      opacity:1,
      widthVh:smallerSizeVh,
      heightVh:smallerSizeVh,
      leftVh:TWO_IMAGE_SMALL_OFFSET_VH,
      topVh:TWO_IMAGE_SMALL_OFFSET_VH
    })
  ];
}

function _renderThreeOrMoreImages(urls:readonly string[]) {
  const visibleUrls = urls.slice(-3);
  return visibleUrls.map((url, index) => _renderImageLayer(url, THREE_IMAGE_LAYERS[index]));
}

function DiscoveryItem({urls}:Props) {
  let content:ReactNode;
  if (!urls.length) {
    content = _renderZeroImages();
  } else if (urls.length === 1) {
    content = _renderOneImage(urls[0]);
  } else if (urls.length === 2) {
    content = _renderTwoImages(urls);
  } else {
    content = _renderThreeOrMoreImages(urls);
  }

  return <div
    className={styles.container}
    style={{
      width:`${TARGET_BOUNDING_RECT_SIZE_VH}vh`,
      height:`${TARGET_BOUNDING_RECT_SIZE_VH}vh`
    }}
  >
    {content}
  </div>;
}

export default DiscoveryItem;
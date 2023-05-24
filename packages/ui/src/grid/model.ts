import { photoFlexLayout } from 'photo-flex-layout';
import { createDomain , combine } from 'effector';
import { createGate } from 'effector-react';
import { throttle } from 'patronum';
import { IPhoto } from 'types';

import { defaultWidth, defaultHeight } from './const';


export const gridDomain = createDomain();

export const WidthGate = createGate<{ width: number, height: number }>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
const throttleWidth = throttle({ source: WidthGate.state, timeout: 10 });

const $width = gridDomain.createStore(defaultWidth);
$width.on(throttleWidth, (_, { width }) => width);

export const $height = gridDomain.createStore(defaultHeight);
$height.on(WidthGate.state, (_, { height }) => height);

export const setPhotoList = gridDomain.createEvent<IPhoto[]>();
export const $photoList = gridDomain.createStore<IPhoto[]>([]);
$photoList.on(setPhotoList, (_, photoList) => photoList);

export const $layourList = combine([$photoList, $width]).map(([photoList, width]) => {
  return photoFlexLayout({
    targetRowHeight: 280,
    containerWidth: width,
    boxSpacing: 2,
    items: photoList,
  });
});

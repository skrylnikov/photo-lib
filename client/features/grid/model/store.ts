import { combine } from 'effector';
import { createGate } from 'effector-react';
import { throttle } from 'patronum';
import { photoModel } from '../../../entitites/photo';
import { photoFlexLayout } from 'photo-flex-layout';

import { defaultWidth, defaultHeight } from '../const';

import { gridDomain } from './domain';


export const WidthGate = createGate<{width: number, height: number}>();

const throttleWidth = throttle({ source: WidthGate.state, timeout: 10 });

const $width = gridDomain
  .createStore(defaultWidth)
  .on(throttleWidth, (_, { width }) => width)
; 

export const $height = gridDomain 
  .createStore(defaultHeight)
  .on(WidthGate.state, (_, { height }) => height)
;

export const $layourList = combine([photoModel.$groupedPhotoByMonth, $width])
  .map(([groupedPhotoByMonth, width]) => groupedPhotoByMonth
    .map((photoList) => photoFlexLayout(photoList.list,{
      targetRowHeight: 280,
      containerWidth: width, 
      // containerPadding: 0,
      boxSpacing: 5,
      // boxSpacing: {
      //   vertical: 20,
      //   horizontal: 1,
      // },
    }),
    ),
  )
;

import React, { useRef } from "react";
import useResizeObserver from 'use-resize-observer';
import { useStore, useGate } from 'effector-react';
import { photoModel } from '../../../entitites/photo';
import VirtualList from 'react-tiny-virtual-list';


import { $layourList, $height, WidthGate } from '../model';
import { defaultWidth, defaultHeight } from '../const';

import { Card } from './card';
import { Wrapper } from './styled';

export const Grid = () => {
  const photoList = useStore(photoModel.$groupedPhotoByMonth);
  const layourList = useStore($layourList);
  const height = useStore($height);
  const ref = useRef<HTMLDivElement>(null);


  const resize = useResizeObserver({ ref });
  useGate(WidthGate, { width: resize.width || defaultWidth, height: resize.height || defaultHeight });


  return (
    <Wrapper ref={ref}>

      <VirtualList
        width={"100%"}
        height={height}
        itemCount={photoList.length}
        itemSize={(i) => layourList[i].containerHeight + 20}
        renderItem={({ index, style }) => {
          const geometry = layourList[index];
          return (
            <div key={index} style={style}>
              {photoList[index].date}
              <div style={{ position: 'relative' }}>
                {geometry.boxes.map((x, i) => <Card key={i} data={photoList[index].list[i]} box={x}/>)}
              </div>
            </div>
          );
        }
        }
      />

    </Wrapper>

  );
};

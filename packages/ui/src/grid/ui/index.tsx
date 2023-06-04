import React, { useRef, useEffect } from "react";
import useResizeObserver from 'use-resize-observer';
import { useStore, useGate } from 'effector-react';
import { IImage } from 'types';

import { $layourList, WidthGate, setPhotoList } from '../model';
import { defaultWidth, defaultHeight } from '../const';

import { Card } from './card';
import { Wrapper } from './styled';

interface IProps {
  photoList: IImage[];
  onClick: (id: string) => void;
}

export const Grid = ({ photoList, onClick }: IProps) => {
  const layour = useStore($layourList);
  // const height = useStore($height);
  const ref = useRef<HTMLDivElement>(null);

  const resize = useResizeObserver({ ref });
  useGate(WidthGate, { width: resize.width || defaultWidth, height: resize.height || defaultHeight });

  useEffect(() => {
    setPhotoList(photoList);
  }, [photoList]);


  return (
    <Wrapper ref={ref}>
      <div style={{ position: 'relative' }}>
        {layour.boxes.map((x, i) => <Card key={i} data={photoList[i]} box={x} onClick={onClick} />)}
      </div>
    </Wrapper>

  );
};

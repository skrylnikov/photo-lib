import React from "react";
import { ILayoutBox } from 'photo-flex-layout';
import { IPhoto } from '../../../shared/api/photo';

import { CardWrapper, Image } from './styled';

interface IProps {
  data: IPhoto;
  box: ILayoutBox;
}

export const Card = ({ data, box }: IProps) => {
  // const height = Math.min(box.height, 300);
  const height = Math.min(box.height, 400);
  const width = box.width;

  const rotate = typeof data.orientation === 'number' ? data.orientation : Number.parseInt(data.orientation?.split?.(' ')?.[1]) || 0;


  return (
    <CardWrapper key={data._id} style={{ width, height, top: box.top, left: box.left }} vibrant={data.vibrant}>
      {/* <p>{data.filename}</p> */}
      <Image transform={`rotate(${data.rotate || 0}deg) scale(${data.scaleX || 1}, ${data.scaleY || 1})`} src={'/api/preview/' + data._id + '.webp'}
        height={data.rotate === 270 ? width : height}
        width={data.rotate === 270 ? height : width} alt="" />
    </CardWrapper>
  );
};

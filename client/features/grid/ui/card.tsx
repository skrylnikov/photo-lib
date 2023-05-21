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
  const height = box.height;

  return (
    <CardWrapper key={data._id} style={{ width: box.width, height, top: box.top, left: box.left }}>
      {/* <p>{data.filename}</p> */}
      <Image src={'/api/preview/' + data._id + '.jpg'} height={height} width={box.width} alt="" />
    </CardWrapper>
  );
};

import React from "react";
import { IPhoto } from 'shared/api/photo';

import { CardWrapper, Image } from './styled';

interface IProps {
  data: IPhoto
}

export const Card = ({ data }: IProps) => {

  return (
    <CardWrapper key={data._id}>
      <p>{data.filename}</p>
      <Image src={'/api/preview/' + data._id + '.jpg'} alt="" />
    </CardWrapper>
  );
};

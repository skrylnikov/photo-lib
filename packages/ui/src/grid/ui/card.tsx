import React, { useMemo } from "react";
import { ILayoutBox } from 'photo-flex-layout';
import { IPhoto } from 'types';

import { CardWrapper, Image } from './styled';

interface IProps {
  data: IPhoto;
  box: ILayoutBox;
  onClick: (id: string) => void;
}

export const Card = ({ data, box, onClick }: IProps) => {
  const height = box.height;
  const width = box.width;

  const [size, sizex2] = useMemo(() => {
    const heighRounded = Math.floor(height / 25) * 25;
    const widthRounded = Math.floor(width / 25) * 25;

    return [
      `${widthRounded}:${heighRounded}`,
      `${widthRounded * 2}:${heighRounded * 2}`,
    ];
  }, [width, height]);

  return (
    <CardWrapper
      key={data.id}
      style={{ width, height, top: box.top, left: box.left }}
      vibrant={data.vibrant}
      onClick={() => onClick(data.id)}
    >
      <Image transform={`rotate(${0}deg) scale(${1}, ${1})`}
        src={`imgproxy/insecure/rs:fit:${size}:false:0/plain/local:///${data.path}@webp`}
        srcSet={`imgproxy/insecure/rs:fit:${sizex2}:false:0/plain/local:///${data.path}@webp 2x`}
        loading="lazy"
        height={height}
        width={width} alt="" />
    </CardWrapper>
  );
};

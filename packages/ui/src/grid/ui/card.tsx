import React, { useMemo } from "react";
import { ILayoutBox } from 'photo-flex-layout';
import { IImage } from 'types';

import { CardWrapper, Image } from './styled';

interface IProps {
  data: IImage;
  box: ILayoutBox;
  onClick: (id: string) => void;
}

export const Card = ({ data, box, onClick }: IProps) => {
  const height = box.height;
  const width = box.width;

  const image = useMemo(() => data.thumbnails.find((x) => x.size === 'hd') || data.thumbnails[0], [data]);
  const uhd = useMemo(() => data.thumbnails.find((x) => x.size === 'uhd') || data.thumbnails[0], [data]);

  return (
    <CardWrapper
      key={data.id}
      style={{ width, height, top: box.top, left: box.left }}
      vibrant={data.LightMuted}
      target="_blank"
      rel="noreferrer"
      href={`/storage/thumbnails/${uhd.path}`}
      data-pswp-width={uhd.width}
      data-pswp-height={uhd.height}
    >
      <img
        src={`/storage/thumbnails/${image.path}`}
        loading="lazy"
        height={height}
        width={width}
        alt=""
      />
    </CardWrapper>
  );
};

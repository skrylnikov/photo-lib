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

  const imageMap = useMemo(() => {
    return Object.fromEntries(data.thumbnails.map(x => [x.format + '_' + x.size, x]));
  }, [data]);

  return (
    <CardWrapper
      key={data.id}
      style={{ width, height, top: box.top, left: box.left }}
      vibrant={data.LightMuted}
      onClick={() => onClick(data.id)}
    >
      <picture>
        {imageMap.avif_x2 && <source srcSet={`/storage/thumbnails/${imageMap.avif_x2.path} 2x`} type="image/avif" />}
        {imageMap.webp_x2 && <source srcSet={`/storage/thumbnails/${imageMap.webp_x2.path} 2x`} type="image/webp" />}
        {imageMap.avif_x1 && <source srcSet={`/storage/thumbnails/${imageMap.avif_x1.path}`} type="image/avif" />}
        {imageMap.webp_x1 && <source srcSet={`/storage/thumbnails/${imageMap.webp_x1.path}`} type="image/webp" />}
        <img
          src={`/storage/thumbnails/${imageMap.webp_x1.path}`}
          loading="lazy"
          height={height}
          width={width} alt="" />
      </picture>
      {/* <Image transform={`rotate(${0}deg) scale(${1}, ${1})`}
        src={`/storage/thumbnails/${data.thumbnails[0].path}`}
        // srcSet={`imgproxy/insecure/rs:fit:${sizex2}:false:0/plain/local:///${data.id}@webp 2x`}
        loading="lazy"
        height={height}
        width={width} alt="" /> */}
    </CardWrapper>
  );
};

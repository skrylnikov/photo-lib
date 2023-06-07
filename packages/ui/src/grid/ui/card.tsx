import React, { useMemo } from "react";
import { ILayoutBox } from 'photo-flex-layout';
import { motion } from 'framer-motion';
import { IImage } from 'types';

import { CardWrapper } from './styled';

interface IProps {
  i: number;
  data: IImage;
  box: ILayoutBox;
  onClick: (id: string) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const imageData = {
  avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=',
  webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
};

let supportWebp = false;
let supportAvif = false;


function checkImageFormatSupport(imageFormat: 'webp' | 'avif') {
  const img = new Image();

  img.src = imageData[imageFormat];

  img.addEventListener('load', function () {
    if ((img.width > 0) && (img.height > 0)) {
      if (imageFormat === 'webp') supportWebp = true;
      if (imageFormat === 'avif') supportAvif = true;
    }
  });
}

checkImageFormatSupport('webp');
checkImageFormatSupport('avif');


export const Card = ({ data, box, i, scrollRef }: IProps) => {
  const height = box.height;
  const width = box.width;

  const previewAvif = useMemo(() => data.thumbnails.find((x) => x.size === 'preview' && x.format === 'avif'), [data]);
  const previewWebp = useMemo(() => data.thumbnails.find((x) => x.size === 'preview' && x.format === 'webp'), [data]);
  const fullAvif = useMemo(() => supportAvif && data.thumbnails.find((x) => x.size === 'full' && x.format === 'avif'), [data]);
  const fullWebp = useMemo(() => supportWebp && data.thumbnails.find((x) => x.size === 'full' && x.format === 'webp'), [data]);
  const original = data.files[0];

  const full = fullAvif || fullWebp || original;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: i / 10 }}
    >

      <CardWrapper
        key={data.id}
        style={{ width, height, top: box.top, left: box.left }}
        vibrant={data.LightMuted}
        target="_blank"
        rel="noreferrer"
        href={`/storage/${(fullAvif || fullWebp) ? 'thumbnails' : 'file'}/${full.path}`}
        data-pswp-width={full.width}
        data-pswp-height={full.height}
      >
        <picture >
          {previewAvif && <source srcSet={`/storage/thumbnails/${previewAvif.path}`} type="image/avif" />}
          {previewWebp && <source srcSet={`/storage/thumbnails/${previewWebp.path}`} type="image/webp" />}
          <img
            src={`/storage/file/${original.path}`}
            loading="lazy"
            height={height}
            width={width}
            alt=""
          />
        </picture>
      </CardWrapper>
    </motion.div>

  );
};

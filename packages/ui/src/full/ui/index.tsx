import React, { useEffect, useState, useMemo } from 'react';
import { useKey } from 'react-use';
import { IImage } from 'types';

import { Wrapper, Picture, Image, Close, Left, Right } from './style';

interface IProps {
  photo: IImage;
  onNext: () => void;
  onPrev: () => void;
  close: () => void;
}

export const Full = ({ photo, close, onNext, onPrev }: IProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useKey('Escape', close);
  useKey('ArrowRight', onNext);
  useKey('ArrowLeft', onPrev);

  useEffect(() => {
    setIsLoaded(false);
  }, [photo]);

  const thumbnailMap = useMemo(() => {
    return Object.fromEntries(photo.thumbnails.filter((x) => x.size === 'full').map(x => [x.format, x]));
  }, [photo]);


  return (
    <Wrapper background={'rgba(0,0,0,0.1)'}>
      <Close onClick={close} >+</Close>
      <Left onClick={onPrev} >←</Left>
      <Right onClick={onNext} >→</Right>
      <Picture>
        {thumbnailMap.avif && <source srcSet={`/storage/thumbnails/${thumbnailMap.avif.path}`} type="image/avif" />}
        {thumbnailMap.webp && <source srcSet={`/storage/thumbnails/${thumbnailMap.webp.path}`} type="image/webp" />}
        <Image
          src={`/storage/thumbnails/${thumbnailMap.webp.path}`}
          loading="lazy"
          alt=""
          onLoad={(e) => {
            setIsLoaded(true);
            console.log('onLoad', e);
          }}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />

      </Picture>
      {/* <Image
        src={`imgproxy/insecure/skp:jpg/plain/local:///${photo.path}@jpg`}
        onLoadStart={(e) => {
          setIsLoaded(false);
          console.log('onLoadStart', e);
        }}
        onLoadedData={(e) => {
          setIsLoaded(true);
          console.log('onLoadedData', e);
        }}
        onLoad={(e) => {
          setIsLoaded(true);
          console.log('onLoad', e);
        }}
        onProgress={(e) => {
          console.log('onProgress', e);
        }}
        style={{ opacity: isLoaded ? 1 : 0 }}
      /> */}
    </Wrapper>
  );
};


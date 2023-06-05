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

  const image = useMemo(() => photo.thumbnails.find((x) => x.size === 'uhd') || photo.thumbnails[0], [photo]);


  return (
    <Wrapper background={'rgba(0,0,0,0.1)'}>
      <Close onClick={close} >+</Close>
      <Left onClick={onPrev} >←</Left>
      <Right onClick={onNext} >→</Right>
      <Image
        src={`/storage/thumbnails/${image.path}`}
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
        style={{ opacity: isLoaded ? 1 : 0 }}
      />
    </Wrapper>
  );
};


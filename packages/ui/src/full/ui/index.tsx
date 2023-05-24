import React, { useEffect, useState } from 'react';
import { useKey } from 'react-use';
import { IPhoto } from 'types';

import { Wrapper, Image, Close, Left, Right } from './style';

interface IProps {
  photo: IPhoto;
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


  return (
    <Wrapper background={photo.vibrant || 'rgba(0,0,0,0.1)'}>
      <Close onClick={close} >+</Close>
      <Left onClick={onPrev} >←</Left>
      <Right onClick={onNext} >→</Right>
      <Image
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
      />
    </Wrapper>
  );
};


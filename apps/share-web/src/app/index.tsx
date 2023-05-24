import React from "react";
import { useUnit } from 'effector-react';

import { photoModel } from '@/entities/photo';
import { Home } from '@/pages/home';
import { Full } from 'ui';

import './style.css';

photoModel.loadPhotoFx().catch((e) => console.error(e));

export const App = () => {
  const fullPhoto = useUnit(photoModel.$fullPhoto);

  if (fullPhoto) {
    return (
      <Full
        photo={fullPhoto}
        onNext={photoModel.nextFull}
        onPrev={photoModel.prevFull}
        close={photoModel.closeFull}
      />
    );
  }

  return (
    <Home/>
  );
};




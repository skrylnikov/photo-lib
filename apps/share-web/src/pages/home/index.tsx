import React from "react";
import { useUnit } from 'effector-react';
import { Grid } from 'ui';
import { photoModel } from '@/entities/photo';

import { Wrapper } from './style';

export const Home = () => {
  const photoList = useUnit(photoModel.$photoList);

  return (
    <Wrapper>
      <Grid photoList={photoList} onClick={photoModel.openFull}/>
    </Wrapper>
  );
};

import { useUnit } from 'effector-react';
import React from 'react';
import { Grid } from 'ui';
import { photoModel } from '@/entities/photo';
import { Wrapper } from './style';

export const Home = () => {
  const photoList = useUnit(photoModel.$photoList);

  React.useEffect(() => {
    console.log(photoList);
  }, []);

  return (
    <Wrapper>
      <Grid photoList={photoList} onClick={photoModel.openFull} />
    </Wrapper>
  );
};

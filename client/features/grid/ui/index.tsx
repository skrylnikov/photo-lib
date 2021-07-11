import React from "react";
import { useStore } from 'effector-react';
import { Masonry } from 'masonic';
import { photoModel } from 'entitites/photo';

import { Card } from './card';


export const Grid = () => {
  const photoList = useStore(photoModel.$photoList);
  return (
    <Masonry
      columnCount={3}
      columnWidth={400}
      items={photoList}
      render={({ data }) => (
        <Card data={data}/>
      )}/>
  );
};

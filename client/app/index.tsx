import React from "react";
import { photoModel } from 'entitites/photo';
import { reindex } from 'shared/api/admin';
import { Grid } from 'features/grid';
import './index.css';

photoModel.loadPhotoFx().catch((e) => console.error(e));

export const App = () => {
  return (<>
    <h1>Photo Lib</h1>
    <button onClick={reindex}>reindex</button>
    <Grid/>
  </>);
};




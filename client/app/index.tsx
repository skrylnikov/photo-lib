import './style';
import React from "react";
import { useStore } from 'effector-react';
import { RouterProvider } from 'react-router5';
import { RootLayout } from 'shared/ui/root-layout';
import { photoModel } from 'entitites/photo';
import { menuModel } from 'entitites/menu';
import { router } from 'entitites/router';
import { Header } from "features/header";
import { Menu } from "features/menu";
import { Page } from 'page';

photoModel.loadPhotoFx().catch((e) => console.error(e));

export const App = () => {
  const openned = useStore(menuModel.$openned);


  return (<RouterProvider router={router}>
    <RootLayout
      menuWidth={openned ? 200 : 60}
      header={<Header/>}
      menu={<Menu/>}
    >
      <Page/>
    </RootLayout>
  </RouterProvider>);
};




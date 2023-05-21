import React from "react";
import { useRoute } from 'react-router5';

import { Home } from './home';
import { Settings } from "./settings";
import { Favorite } from "./favorite";
import { Folder } from "./folder";
import { Search } from "./search";

export const Page = () => {
  const { route } = useRoute();
  if (!route) {
    return (<p>Error: Route not found</p>);
  }

  if (route.name === 'home') {
    return (<Home/>);
  }

  if (route.name === 'settings') {
    return (<Settings/>);
  }

  if (route.name === 'favorite') {
    return (<Favorite/>);
  }

  if (route.name === 'folder') {
    return (<Folder/>);
  }

  if (route.name === 'search') {
    return (<Search/>);
  }


  return (<p>Loading...</p>);
};




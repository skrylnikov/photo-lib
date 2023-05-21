import React from "react";

import { IconButton } from 'shared/ui/icon-button';
import { Icons } from 'shared/ui/icons';

import { changeOpenned } from '../model';

export const MenuButton = () => {

  return (
    <IconButton onPress={changeOpenned}>
      <Icons.Menu/>
    </IconButton>
  );
};

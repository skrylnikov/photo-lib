import React from "react";
import { useStore } from 'effector-react';
import { useRoute } from 'react-router5';
import { MenuItem } from 'shared/ui/menu-item';
import { Icons } from 'shared/ui/icons';
import { menuModel } from 'entitites/menu';
import { router } from 'entitites/router';

import { Wrapper } from './style';

export const Menu = () => {
  const openned = useStore(menuModel.$openned);
  const { route } = useRoute();

  return (
    <Wrapper>
      <MenuItem
        icon={<Icons.Home/>}
        label={'Home'}
        isSmall={!openned}
        isActive={route?.name === 'home'}
        onPress={() => router.navigate('home')}
      />
      <MenuItem
        icon={<Icons.Search/>}
        label={'Search'}
        isSmall={!openned}
        isActive={route?.name === 'search'}
        onPress={() => router.navigate('search')}
      />
      <MenuItem
        icon={<Icons.Favourite/>}
        label={'Favourite'}
        isSmall={!openned}
        isActive={route?.name === 'favorite'}
        onPress={() => router.navigate('favorite')}
      />
      <MenuItem
        icon={<Icons.Folder/>}
        label={'Folder'}
        isSmall={!openned}
        isActive={route?.name === 'folder'}
        onPress={() => router.navigate('folder')}
      />
      <MenuItem
        icon={<Icons.Settings/>}
        label={'Settings'}
        isSmall={!openned}
        isActive={route?.name === 'settings'}
        onPress={() => router.navigate('settings')}
      />
    </Wrapper>
  );
};

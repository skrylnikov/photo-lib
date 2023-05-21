import React from "react";
import { MenuButton } from 'entitites/menu';

import { Wrapper, Left, Center, Right, Title, Input } from './style';

export const Header = () => {

  return (
    <Wrapper>
      <Left>
        <MenuButton/>
        <Title>Photo Lib</Title>
      </Left>
      <Center>
        <Input disabled={true} placeholder={'Search'}/>
      </Center>
      <Right></Right>
    </Wrapper>
  );
};

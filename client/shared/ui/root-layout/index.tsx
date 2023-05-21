import React from "react";

import { Wrapper, HeadedWrapper, MenuWrapper, ContentWrapper } from './style';

interface IProps {
  menuWidth: number;
  children: JSX.Element;
  header: JSX.Element;
  menu: JSX.Element;
}

export const RootLayout = ({ menuWidth, children, header, menu }: IProps) => {

  return (
    <Wrapper menuWidth={menuWidth}>
      <HeadedWrapper>{header}</HeadedWrapper>
      <MenuWrapper width={menuWidth}>{menu}</MenuWrapper>
      <ContentWrapper>{children}</ContentWrapper>
    </Wrapper>
  );
};

import { styled } from '@linaria/react';
// import { he } from 'polished';

export const Wrapper = styled.div<{menuWidth: number}>`
  display: grid;
  grid-template-areas:
    "header header"
    "menu content"
  ;
  grid-template-rows: 50px 1fr;
  grid-template-columns: min-content 1fr;
  height: 100vh;
`;

export const HeadedWrapper = styled.header`
  grid-area: header;
`;

export const MenuWrapper = styled.nav<{width: number}>`
  width: ${(props) => props.width}px;
  grid-area: menu;
  transition: 300ms;
`;

export const ContentWrapper = styled.article`
  grid-area: content;
`;



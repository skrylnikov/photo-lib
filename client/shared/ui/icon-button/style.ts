import { styled } from "@linaria/react";

export const Wrapper = styled.button<{isHovered: boolean}>`
  background: ${(props) => props.isHovered ? 'rgba(0,0,0,0.05)' : 'none'};
  border-radius: 5px;
  padding: 0;
  width: 36px;
  height: 36px;
  border: 2px solid rgba(0,0,0,0);

  &:active, &:focus, &:focus-visible{
    outline: 0;
    border: 2px solid rgba(0,0,0,0.1);
    color: red;
  }

  svg {
    width: 32px;
    height: 32px;
  }
`;

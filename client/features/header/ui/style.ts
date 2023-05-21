import { styled } from "@linaria/react";
import { directionalProperty } from 'polished';

export const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;
  height: 40px;
  ${directionalProperty('padding', '5px', '10px')}
`;

export const Left = styled.div`
  display: flex;
  align-items: flex-end;
`;

export const Center = styled.div`
  display: flex;
  align-items: flex-end;
`;

export const Right = styled.div``;

export const Title = styled.h1`
  margin: 0;
  margin-left: 10px;
  line-height: 1;
  font-weight: 250;
`;

export const Input = styled.input``;

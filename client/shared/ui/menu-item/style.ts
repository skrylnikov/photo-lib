import { styled } from "@linaria/react";
import { transitions } from 'polished';

export const Wrapper = styled.button<{isHovered: boolean, isSmall: boolean, isActive: boolean}>`
  --color: ${(props) => props.isActive ? 'rgba(0,0,0,1)' : props.isHovered ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)'};

  background: none;
  border-radius: 5px;
  padding: 0;
  height: 40px;
  width: ${(props) => props.isSmall ? '40px' : '180px'};
  border: 2px solid ${(props) => props.isHovered && !props.isActive ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0)'};
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: ${(props) => props.isActive? 'default': 'pointer'};
  margin: 5px;
  padding-left: 4px;
  color: var(--color);
  font-weight: 100;
  ${transitions(['border', 'color'], 'ease 300ms')}

  &:active, &:focus, &:focus-visible{
    outline: 0;
    border: 2px solid rgba(0,0,0,0.1);
  }

  svg {
    width: 26px;
    height: 26px;
    stroke: var(--color);
    ${transitions(['stroke', 'opacity'], 'ease 300ms')}
    opacity: ${(props) => props.isActive || props.isHovered ? 1 : 0.75};
  }
`;

export const Label = styled.label`
  font-size: 20px;
  padding-top: 2px;
  padding-left: 10px;
  cursor: inherit;
  font-weight: 400;
  color: var(--color);
`;

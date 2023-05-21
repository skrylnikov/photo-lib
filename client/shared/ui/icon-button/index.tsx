import React, {useRef} from "react";
import { useButton,  } from '@react-aria/button';
import {useHover} from '@react-aria/interactions';
import { AriaButtonProps } from '@react-types/button';

import { Wrapper } from './style';

interface IProps extends AriaButtonProps<'button'>{
  children: JSX.Element;
}

export const IconButton = ({ children, ...props }: IProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);
  const { hoverProps, isHovered } = useHover({});

  return (
    <Wrapper
      {...buttonProps}
      {...hoverProps}
      ref={ref}
      isHovered={isHovered}
    >
      {children}
    </Wrapper>
  )
};

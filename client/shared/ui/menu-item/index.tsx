import React, { useRef } from "react";
import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { AriaButtonProps } from '@react-types/button';

import { Wrapper, Label } from './style';

interface IProps extends AriaButtonProps<'button'>{
  icon: JSX.Element;
  label: string;
  isSmall: boolean;
  isActive: boolean;
}

export const MenuItem = ({ icon, label, isSmall, isActive, ...props }: IProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);
  const { hoverProps, isHovered } = useHover({});

  return (
    <Wrapper
      {...buttonProps}
      {...hoverProps}
      ref={ref}
      isHovered={isHovered}
      isSmall={isSmall}
      isActive={isActive}
      title={isSmall ? label : undefined}
    >
      {icon}
      {!isSmall && (<Label>{label}</Label>)}
    </Wrapper>
  );
};
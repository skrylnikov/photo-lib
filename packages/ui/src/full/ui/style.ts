import styled from "@emotion/styled";

export const Wrapper = styled.div<{background: string}>`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: ${({ background }) => background};
  transition: background 0.5s ease;
`;

export const Image = styled.img`
  max-width: 100%;
  max-height: 100%;
  objectFit: contain;
  transition: opacity 0.15s ease;
`;

const Button = styled.button`
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.4;
  transition: opacity 0.3s ease;
  &:hover {
    opacity: 1;
  }
`;

export const Close = styled(Button)`
  top: 10px;
  left: 10px;
  padding: 8px;
  border: none;
  cursor: pointer;
  transform: rotate(45deg);
`;

export const Left = styled(Button)`
  top: 50%;
  left: 10px;
  padding: 8px;
  border: none;
  cursor: pointer;
`;

export const Right = styled(Button)`
  top: 50%;
  right: 10px;
  padding: 8px;
  border: none;
  cursor: pointer;
`;

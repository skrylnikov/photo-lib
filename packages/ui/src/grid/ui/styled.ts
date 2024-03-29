import styled from '@emotion/styled';

export const CardWrapper = styled.a<{ vibrant: string | null }>`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  p {
    margin: 0;
  }

  background-color: ${(props) => props.vibrant || 'rgba(0,0,0,0.1)'};
`;

export const Image = styled.img<{ transform: string }>`
  transform: ${(props) => props.transform};
  aspect-ratio: 1;
`;

export const Wrapper = styled.div`
  height: 100vh;
`;

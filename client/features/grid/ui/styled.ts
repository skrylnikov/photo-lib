import { styled } from '@linaria/react';


export const CardWrapper = styled.div<{vibrant?: string}>`
  /* margin: 5px; */
  position: absolute;
  display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  p{
    margin: 0;
    /* margin-bottom:2px;*/
  }

  background-color: ${(props) => props.vibrant || 'rgba(0,0,0,0.1)'};
`;

export const Image = styled.img<{transform: string}>`
  /* max-width: 100%;
   max-height: 100%; */
   transform: ${(props) => props.transform};
   aspect-ratio: 1;
`;

export const Wrapper = styled.div`
  height: calc(100vh - 100px);
  
`;

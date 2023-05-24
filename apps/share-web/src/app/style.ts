import { css } from "@linaria/core";
import 'reseter.css';

export const global = css`
  :global() {
    @font-face {
      font-family: "Raleway";
      font-style: normal;
      font-weight: 100 900;
      src: local("Raleway"),
        url("/fonts/Raleway-VF.woff2") format("woff2"),
        url("/fonts/Raleway-VF.woff") format("woff");
    }
    @font-face {
      font-family: "Raleway";
      font-style: italic;
      font-weight: 100 900;
      src: local("Raleway"),
        url("/fonts/Raleway-Italic-VF.woff2") format("woff2"),
        url("/fonts/Raleway-Italic-VF.woff") format("woff");
    }

    body {
      font-family: "Raleway", sans-serif;
      margin: 0;
    }

    button {
      font-family: "Raleway", sans-serif;
    }
  }
`;

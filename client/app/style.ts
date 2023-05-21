import { css } from "@linaria/core";
import 'reseter.css';

export const global = css`
  :global() {
    @font-face {
      font-family: "Raleway";
      font-style: normal;
      font-weight: 100 900;
      /* Браузер сначала попробует найти шрифт локально */
      src: local("Raleway"),
        /* Если не получилось, загрузит woff2 */
        url("/fonts/Raleway-VF.woff2") format("woff2"),
        /* Если браузер не поддерживает woff2, загрузит woff */
        url("/fonts/Raleway-VF.woff") format("woff");
    }
    @font-face {
      font-family: "Raleway";
      font-style: italic;
      font-weight: 100 900;
      /* Браузер сначала попробует найти шрифт локально */
      src: local("Raleway"),
        /* Если не получилось, загрузит woff2 */
        url("/fonts/Raleway-Italic-VF.woff2") format("woff2"),
        /* Если браузер не поддерживает woff2, загрузит woff */
        url("/fonts/Raleway-Italic-VF.woff") format("woff");
    }

    body {
      font-family: "Raleway", sans-serif;
    }

    button {
      font-family: "Raleway", sans-serif;
    }
  }
`;

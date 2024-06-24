// /src/pages/_document.tsx

import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="ef659eb5-09ef-405d-b68c-c97d72e32ae7"
        ></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

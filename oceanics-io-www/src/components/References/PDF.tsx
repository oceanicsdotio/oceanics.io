/**
 * React and friends
 */
import React from "react";
import type { FC } from "react";
import {
  Document, Page,
} from 'react-pdf/dist/esm/entry.webpack';

/**
 * This is broken for NextJS. We don't use annotations, so temporarily disabling.
 * See https://nextjs.org/docs/messages/css-global for more information.
 */
// import "react-pdf/dist/esm/Page/AnnotationLayer.css";

interface IPDF {
  file: string;
  pages: number;
}

const PDF: FC<IPDF> = ({ file, pages = 1 }) => {
  return (
    <Document
      file={file}
      onLoadSuccess={() => {}}
      options={{
        cMapUrl: "cmaps/",
        cMapPacked: true,
      }}
    >
      {Array.from(
        new Array(pages),
        // @ts-ignore
        (_, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} />
        )
      )}
    </Document>
  );
};

export default PDF;

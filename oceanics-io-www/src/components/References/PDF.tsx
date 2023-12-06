import React from "react";
import { Document, Page } from 'react-pdf';

export interface IPDF {
  file: string;
  pages: number;
}

const PDF = ({ file, pages = 1 }: IPDF) => {

  const pageNumbers = Array.from(new Array(pages), (_, index) => index + 1);

  return (
    <Document
      file={file}
      options={{
        cMapUrl: "cmaps/",
        cMapPacked: true,
      }}
    >
      {pageNumbers.map((pageNumber) =>
          <Page key={`page_${pageNumber}`} pageNumber={pageNumber} />
      )}
    </Document>
  );
};

export default PDF;

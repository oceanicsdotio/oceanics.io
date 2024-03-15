import React from "react";
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

export interface IPDF {
  /**
   * Web-accessible source, ideally a CDN
   */
  file: string;
  /**
   * Page of the document to render
   */
  page: number;
}

/**
 * Load and display a PDF file.
 */
export const PDF = ({ file, page = 1 }: IPDF) => {
  return (
    <Document file={file}>
      <Page 
        pageNumber={page} 
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />
    </Document>
  );
};

export default PDF;

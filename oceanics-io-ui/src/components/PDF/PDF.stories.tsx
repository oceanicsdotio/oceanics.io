/**
 * React and friends
 */
 import React from 'react';
 import {Meta, Story} from "@storybook/react";
 
 
 const PDF_CDN_ROUTE = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/johnson-etal-2019-sesf.pdf"
 
 
 // @ts-ignore
 import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
 import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
 
  /**
   * Storybook interface
   */
  export default {
    component: Document,
    title: 'PDF/PDF',
  } as Meta;
  
  /**
   * Base version
   */
 
 const Template: Story<any> = () => {
    return <Document
        file={PDF_CDN_ROUTE}
        onLoadSuccess={()=>{}}
        options={{
            cMapUrl: 'cmaps/',
            cMapPacked: true,
          }}
    >
        {
            
        Array.from(
            new Array(2),
            // @ts-ignore
            (el, index) => (
            <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
            />
            ),
        )
        }
    </Document>
};
 
  /**
   * Example
   */
  export const Example = Template.bind({});
  Example.args = {};
  
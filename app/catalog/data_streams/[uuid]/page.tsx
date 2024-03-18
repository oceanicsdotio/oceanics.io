import React, { Suspense } from "react";
import DataStream from "./DataStream";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css"

export const metadata: Metadata = {
  title: "Oceanics.io | Data Stream",
  description: "Streaming and synthetic time series data.",
};

export async function generateStaticParams() { 
  return [{
    uuid: "example",
    name: "Example"
  }]
}

export default function Page({params}: {params: {uuid: string}}) {
  return (
    <> 
      <h2><Link className={layout.link} href={"/catalog/data_streams/"}>
      Data Streams
      </Link></h2>
      <h3>{params.uuid}</h3>
      <Suspense fallback={<p>Loading...</p>}>
        <DataStream
            streamColor="lightblue"
            overlayColor="lightblue"
            backgroundColor="#110022"
            lineWidth={2}
            pointSize={4}
            capacity={1000}
            tickSize={16}
            fontSize={32}
            labelPadding={8}
            binSize={100}
        ></DataStream>
        </Suspense>
    </>
  );
}
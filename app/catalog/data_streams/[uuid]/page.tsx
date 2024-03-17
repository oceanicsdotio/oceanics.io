import React, { Suspense } from "react";
import DataStream from "./DataStream";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Data Stream",
  description: "Access streaming time series data.",
};

export async function generateStaticParams() { 
  return [{
    uuid: "example"
  }]
}

export default function Page() {
  return (
    <>
      <Suspense>
        <DataStream
            streamColor="#ffffff"
            overlayColor="#ffffff"
            backgroundColor="#110022"
            lineWidth={2}
            pointSize={4}
            capacity={1000}
            tickSize={16}
            fontSize={32}
            labelPadding={8}
        ></DataStream>
        </Suspense>
    </>
  );
}
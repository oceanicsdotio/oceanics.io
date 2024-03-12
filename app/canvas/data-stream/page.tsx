import React, { Suspense } from "react";
import DataStream from "./DataStream";
import Histogram from "./Histogram";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Data Stream",
  description: "Access streaming time series data.",
};

export default function Page() {
  return (
    <>
      <Suspense>
        <DataStream
            streamColor="#ffffff"
            overlayColor="#ffffff"
            backgroundColor="#000000"
            lineWidth={2}
            pointSize={2}
            capacity={1000}
            tickSize={4}
            fontSize={16}
            labelPadding={2}
        ></DataStream>
        </Suspense>
    </>
  );
}
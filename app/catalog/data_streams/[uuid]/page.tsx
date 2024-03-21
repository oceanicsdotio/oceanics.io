import React, { Suspense } from "react";
import DataStream from "./DataStream";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";
import type { DataStreams } from "@oceanics/app";

export const metadata: Metadata = {
  title: "Oceanics.io | Data Streams",
  description: "Streaming and synthetic time series data.",
};

export async function generateStaticParams() {
  return [
    {
      uuid: "example",
      name: "Example",
    },
  ];
}

export default function Page({ params }: { params: DataStreams }) {
  let capacity = 100;
  return (
    <>
      <h2>
        <Link className={layout.link} href={"/catalog/data_streams/"}>
          Data Streams
        </Link>
      </h2>
      <h3>{params.name ?? params.uuid}</h3>
      <Suspense fallback={<p>Loading...</p>}>
        <DataStream
          capacity={capacity}
          bins={10}
          timeConstant={1/capacity}
          summary={false}
          draw={{
            streamColor: "lightblue",
            overlayColor: "lightblue",
            backgroundColor: "#11002299",
            lineWidth: 2,
            pointSize: 4,
            tickSize: 8,
            fontSize: 24,
            labelPadding: 8,
          }}
        ></DataStream>
      </Suspense>
    </>
  );
}

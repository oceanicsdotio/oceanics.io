import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";
import DataStreams from "./DataStreams";

export const metadata: Metadata = {
  title: "Oceanics.io | Data Streams",
  description: "Streaming and synthetic time series data.",
};

export default function Page() {
  return (
    <>
      <h2>
        Data Streams
      </h2>
      <p>
        <Link className={layout.link} href={"/catalog/data_streams/example"}>
          Example
        </Link>
      </p>
      <Suspense><DataStreams></DataStreams></Suspense>
    </>
  );
}

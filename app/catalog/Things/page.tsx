import React, { Suspense } from "react";
import Simulation from "./Simulation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Data Stream",
  description: "Access streaming time series data.",
};

export default function Page() {
  return (
    <>
      <Suspense>
        <Simulation
           velocity={{
            metadataFile: "",
            source: ""
           }}
        ></Simulation>
        </Suspense>
    </>
  );
}
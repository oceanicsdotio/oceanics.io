import React, { Suspense } from "react";
import Simulation from "./Simulation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Compute",
  description: "Web GPU instance",
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
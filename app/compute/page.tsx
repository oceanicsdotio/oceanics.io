import React, { Suspense } from "react";
import Simulation from "./Simulation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Things",
  description: "Things demo.",
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
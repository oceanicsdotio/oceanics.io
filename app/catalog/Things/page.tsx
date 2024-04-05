import React, { Suspense } from "react";
import { Metadata } from "next";
import Things from "./Things";
import {components} from "@app/../specification.json";

export const metadata: Metadata = {
  title: "Oceanics.io | Things",
  description: "Streaming and synthetic time series data.",
};

export default function Page() {
  return (
    <>
      <h2>
        Things
      </h2>
      <p>{components.schemas.Things.description}</p>
      <Suspense fallback={<p>Loading...</p>}>
        <Things/>
      </Suspense>
    </>
  );
}

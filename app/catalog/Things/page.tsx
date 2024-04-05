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
      <p>{components.schemas.Things.description}</p>
      <Things/>
    </>
  );
}

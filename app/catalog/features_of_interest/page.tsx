import React, { Suspense } from "react";
import { Metadata } from "next";
import {components} from "@app/../specification.json";
import Link from "next/link";
import layout from "@app/layout.module.css";
import FeaturesOfInterest from "./FeaturesOfInterest";

const name = "Features of Interest"
export const metadata: Metadata = {
  title: `Oceanics.io | ${name}`,
  description: "Features of Interest.",
};

export default function Page() {
  return (
    <>
      <h2>{name}</h2>
      <p>{components.schemas.FeaturesOfInterest.description}</p>
      <Suspense fallback={<p>Loading...</p>}>
        <FeaturesOfInterest/>
      </Suspense>
    </>
  );
}

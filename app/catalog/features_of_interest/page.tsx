import React, { Suspense } from "react";
import { Metadata } from "next";
import {components} from "@app/../specification.json";
import FeaturesOfInterest from "./FeaturesOfInterest";

const name = "Features of Interest"
export const metadata: Metadata = {
  title: `Oceanics.io | ${name}`,
  description: "Features of Interest.",
};

export default function Page() {
  return (
    <div>
      <p>{components.schemas.FeaturesOfInterest.description}</p>
      <FeaturesOfInterest/>
    </div>
  );
}

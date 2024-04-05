import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";
import ObservedProperties from "./ObservedProperties";
import {components} from "@app/../specification.json";

const name = "Observed Properties";
export const metadata: Metadata = {
  title: `Oceanics.io | ${name}`,
  description: "Observed properties.",
};

export default function Page() {
  return (
    <>
      <h2>{name}</h2>
      {/* <p>{components.schemas.ObservedProperties.description}</p> */}
      <Suspense>
        <ObservedProperties/>
      </Suspense>
    </>
  );
}

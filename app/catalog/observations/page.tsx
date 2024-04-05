import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io | Observations",
  description: "Observation.",
};

export default function Page() {
  return (
    <>
      <h2>
        Observations
      </h2>
      <Suspense></Suspense>
    </>
  );
}

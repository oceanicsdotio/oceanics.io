import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";
import Locations from "./Locations";

export const metadata: Metadata = {
  title: "Oceanics.io | Location",
  description: "Location data.",
};

export default function Page() {
  return (
    <>
      <h2>Locations</h2>
      <Suspense fallback={<p>Querying locations...</p>}>
        <Locations />
      </Suspense>
    </>
  );
}

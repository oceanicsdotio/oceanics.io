import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io | Historical Location",
  description: "Historical Locations.",
};

export default function Page() {
  return (
    <>
      <h2>
      Historical Locations
      </h2>
      <Suspense></Suspense>
    </>
  );
}

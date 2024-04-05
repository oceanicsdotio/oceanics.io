import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";
import Sensors from "./Sensors";

export const metadata: Metadata = {
  title: "Oceanics.io | Sensors",
  description: "Sensors.",
};

export default function Page() {
  return (
    <>
      <h2>
        Sensors
      </h2>
      <Suspense>
        <Sensors/>
      </Suspense>
    </>
  );
}

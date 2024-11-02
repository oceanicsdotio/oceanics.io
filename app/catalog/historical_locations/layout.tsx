import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.HistoricalLocations;
export const metadata: Metadata = {
  title: "Oceanics.io | Historical Location",
  description: "Historical Locations.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        href={"/catalog/historical_locations/"}
        prefetch={false}
      >
        {schema.title}
      </Link>
      <div className={layout.content}>
        {children}
      </div>
    </>
  );
}

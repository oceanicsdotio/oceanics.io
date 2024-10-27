import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io | Historical Location",
  description: "Historical Locations.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>{"/"}
        <Link className={layout.link} href={"/catalog/historical_locations/"} prefetch={false}>
          HistoricalLocations
        </Link>
        <div className={layout.content}>{children}</div>
    </>
  );
}

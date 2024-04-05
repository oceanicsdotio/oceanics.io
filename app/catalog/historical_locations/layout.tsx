import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import layout from "../../layout.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io | Historical Location",
  description: "Historical Locations.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2>
        <Link className={layout.link} href={"/catalog/historical_locations/"}>
          Historical Locations
        </Link>
      </h2>
      {children}
    </div>
  );
}

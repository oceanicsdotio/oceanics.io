import React from "react";
import Link from "next/link";
import layout from "../../layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2>
        <Link className={layout.link} href={"/catalog/historical_locations/"}>
          Features of Interest
        </Link>
      </h2>
      {children}
    </div>
  );
}

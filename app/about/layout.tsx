import React from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={layout.content}>
      <h1>
        <Link className={layout.link} href="/">
          Oceanics.io
        </Link>
      </h1>
      {children}
    </div>
  );
}
